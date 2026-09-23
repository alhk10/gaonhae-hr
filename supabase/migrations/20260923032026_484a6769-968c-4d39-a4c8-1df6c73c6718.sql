
CREATE TABLE public.submission_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('school_fees','grading','grading_registration','competition','seminar','guards')),
  record_id uuid NOT NULL,
  student_name text,
  reference_number text,
  amount numeric,
  invoice_id uuid,
  reason text,
  requested_by text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.submission_deletion_requests TO authenticated;
GRANT ALL ON public.submission_deletion_requests TO service_role;

ALTER TABLE public.submission_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view deletion requests"
  ON public.submission_deletion_requests FOR SELECT TO authenticated
  USING (public.is_superadmin((auth.jwt() ->> 'email')));

CREATE POLICY "Superadmins can update deletion requests"
  ON public.submission_deletion_requests FOR UPDATE TO authenticated
  USING (public.is_superadmin((auth.jwt() ->> 'email')))
  WITH CHECK (public.is_superadmin((auth.jwt() ->> 'email')));

CREATE UNIQUE INDEX submission_deletion_requests_pending_uniq
  ON public.submission_deletion_requests (source, record_id)
  WHERE status = 'pending';

CREATE TRIGGER submission_deletion_requests_updated_at
  BEFORE UPDATE ON public.submission_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Submit a deletion request from the public /access lists
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_submission_deletion_request(
  p_source text,
  p_record_id uuid,
  p_student_name text DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_invoice_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_requested_by text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_source NOT IN ('school_fees','grading','grading_registration','competition','seminar','guards') THEN
    RAISE EXCEPTION 'Unknown source %', p_source;
  END IF;
  IF p_record_id IS NULL THEN
    RAISE EXCEPTION 'Record is required';
  END IF;
  IF coalesce(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.submission_deletion_requests
    WHERE source = p_source AND record_id = p_record_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A delete request for this record is already waiting for approval';
  END IF;

  INSERT INTO public.submission_deletion_requests
    (source, record_id, student_name, reference_number, amount, invoice_id, reason, requested_by)
  VALUES
    (p_source, p_record_id, p_student_name, p_reference_number, p_amount, p_invoice_id,
     btrim(p_reason), nullif(btrim(coalesce(p_requested_by,'')), ''))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_submission_deletion_request(text, uuid, text, text, numeric, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_submission_deletion_request(text, uuid, text, text, numeric, uuid, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Superadmin approval / rejection
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_submission_deletion_request(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req public.submission_deletion_requests%ROWTYPE;
  v_email text := (auth.jwt() ->> 'email');
BEGIN
  IF NOT public.is_superadmin(v_email) THEN
    RAISE EXCEPTION 'Only superadmins can approve delete requests';
  END IF;

  SELECT * INTO v_req FROM public.submission_deletion_requests WHERE id = p_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already reviewed';
  END IF;

  IF v_req.source = 'grading' THEN
    PERFORM public.admin_delete_grading_submission(v_req.record_id);
  ELSIF v_req.source = 'grading_registration' THEN
    PERFORM public.admin_delete_grading_registration(v_req.record_id);
  ELSIF v_req.source = 'competition' THEN
    PERFORM public.admin_delete_competition_submission(v_req.record_id);
  ELSIF v_req.source = 'seminar' THEN
    PERFORM public.admin_delete_seminar_submission(v_req.record_id);
  ELSIF v_req.source = 'guards' THEN
    PERFORM public.admin_delete_guards_purchase(v_req.record_id);
  ELSIF v_req.source = 'school_fees' THEN
    PERFORM public.admin_delete_school_fees_submission(v_req.record_id, coalesce(v_email, 'superadmin'));
  ELSE
    RAISE EXCEPTION 'Unknown source %', v_req.source;
  END IF;

  UPDATE public.submission_deletion_requests
     SET status = 'approved', reviewed_by = v_email, reviewed_at = now()
   WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_submission_deletion_request(p_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := (auth.jwt() ->> 'email');
BEGIN
  IF NOT public.is_superadmin(v_email) THEN
    RAISE EXCEPTION 'Only superadmins can reject delete requests';
  END IF;

  UPDATE public.submission_deletion_requests
     SET status = 'rejected', reviewed_by = v_email, reviewed_at = now(), review_note = p_note
   WHERE id = p_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already reviewed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_submission_deletion_request(uuid) FROM public;
REVOKE ALL ON FUNCTION public.reject_submission_deletion_request(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.approve_submission_deletion_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_submission_deletion_request(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Badges for the public lists: pending delete requests + possible duplicates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_submission_flags(p_source text DEFAULT NULL)
RETURNS TABLE(source text, record_id uuid, delete_request_status text, duplicate_of_reference text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH dupes AS (
    SELECT 'grading'::text AS source, g.id AS record_id,
           (SELECT g2.reference_number FROM public.grading_payment_submissions g2
             WHERE g2.id <> g.id
               AND lower(coalesce(g2.email,'')) = lower(coalesce(g.email,''))
               AND upper(coalesce(g2.first_name,'')||' '||coalesce(g2.last_name,''))
                 = upper(coalesce(g.first_name,'')||' '||coalesce(g.last_name,''))
               AND coalesce(g2.amount,0) = coalesce(g.amount,0)
               AND coalesce(g2.branch_id,'') = coalesce(g.branch_id,'')
               AND g2.created_at <= g.created_at
               AND g.created_at - g2.created_at < interval '24 hours'
               AND (g2.created_at < g.created_at OR g2.id < g.id)
             ORDER BY g2.created_at LIMIT 1) AS duplicate_of_reference
      FROM public.grading_payment_submissions g
    UNION ALL
    SELECT 'competition'::text, c.id,
           (SELECT c2.reference_number FROM public.competition_payment_submissions c2
             WHERE c2.id <> c.id
               AND lower(coalesce(c2.email,'')) = lower(coalesce(c.email,''))
               AND upper(coalesce(c2.first_name,'')||' '||coalesce(c2.last_name,''))
                 = upper(coalesce(c.first_name,'')||' '||coalesce(c.last_name,''))
               AND coalesce(c2.amount,0) = coalesce(c.amount,0)
               AND coalesce(c2.branch_id,'') = coalesce(c.branch_id,'')
               AND c2.created_at <= c.created_at
               AND c.created_at - c2.created_at < interval '24 hours'
               AND (c2.created_at < c.created_at OR c2.id < c.id)
             ORDER BY c2.created_at LIMIT 1)
      FROM public.competition_payment_submissions c
    UNION ALL
    SELECT 'seminar'::text, s.id,
           (SELECT s2.reference_number FROM public.seminar_payment_submissions s2
             WHERE s2.id <> s.id
               AND lower(coalesce(s2.email,'')) = lower(coalesce(s.email,''))
               AND upper(coalesce(s2.first_name,'')||' '||coalesce(s2.last_name,''))
                 = upper(coalesce(s.first_name,'')||' '||coalesce(s.last_name,''))
               AND coalesce(s2.amount,0) = coalesce(s.amount,0)
               AND coalesce(s2.branch_id,'') = coalesce(s.branch_id,'')
               AND s2.created_at <= s.created_at
               AND s.created_at - s2.created_at < interval '24 hours'
               AND (s2.created_at < s.created_at OR s2.id < s.id)
             ORDER BY s2.created_at LIMIT 1)
      FROM public.seminar_payment_submissions s
    UNION ALL
    SELECT 'guards'::text, gp.id,
           (SELECT gp2.reference_number FROM public.guards_purchases gp2
             WHERE gp2.id <> gp.id
               AND lower(coalesce(gp2.email,'')) = lower(coalesce(gp.email,''))
               AND upper(coalesce(gp2.first_name,'')||' '||coalesce(gp2.last_name,''))
                 = upper(coalesce(gp.first_name,'')||' '||coalesce(gp.last_name,''))
               AND coalesce(gp2.total,0) = coalesce(gp.total,0)
               AND coalesce(gp2.branch_id,'') = coalesce(gp.branch_id,'')
               AND gp2.created_at <= gp.created_at
               AND gp.created_at - gp2.created_at < interval '24 hours'
               AND (gp2.created_at < gp.created_at OR gp2.id < gp.id)
             ORDER BY gp2.created_at LIMIT 1)
      FROM public.guards_purchases gp
    UNION ALL
    SELECT 'school_fees'::text, f.id,
           (SELECT f2.reference_number FROM public.public_chat_payment_submissions f2
             WHERE f2.id <> f.id
               AND f2.session_id IS NOT DISTINCT FROM f.session_id
               AND coalesce(f2.amount,0) = coalesce(f.amount,0)
               AND coalesce(f2.branch_id,'') = coalesce(f.branch_id,'')
               AND f2.created_at <= f.created_at
               AND f.created_at - f2.created_at < interval '24 hours'
               AND (f2.created_at < f.created_at OR f2.id < f.id)
             ORDER BY f2.created_at LIMIT 1)
      FROM public.public_chat_payment_submissions f
  ),
  pending AS (
    SELECT r.source, r.record_id, r.status
      FROM public.submission_deletion_requests r
     WHERE r.status = 'pending'
  )
  SELECT d.source, d.record_id, p.status, d.duplicate_of_reference
    FROM dupes d
    LEFT JOIN pending p ON p.source = d.source AND p.record_id = d.record_id
   WHERE (p_source IS NULL OR d.source = p_source)
     AND (p.status IS NOT NULL OR d.duplicate_of_reference IS NOT NULL)
  UNION ALL
  SELECT p.source, p.record_id, p.status, NULL::text
    FROM pending p
   WHERE p.source = 'grading_registration'
     AND (p_source IS NULL OR p.source = p_source);
$$;

REVOKE ALL ON FUNCTION public.get_public_submission_flags(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_submission_flags(text) TO anon, authenticated;
