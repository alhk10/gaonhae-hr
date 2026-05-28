
-- Seminar product
INSERT INTO public.products (sku, name, description, base_price, tax_rate, is_active, kind)
SELECT 'SEMINAR-UCS', 'Unarmed Combat Seminar', 'Unarmed Combat Seminar at Bukit Merah Branch', 81.75, 0, true, 'seminar'
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Unarmed Combat Seminar');

-- Submissions table
CREATE TABLE IF NOT EXISTS public.seminar_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE NOT NULL DEFAULT (
    'SEM-' || to_char(now(), 'YYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''), 1, 6)
  ),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  branch_id text NOT NULL REFERENCES public.branches(id),
  date_of_birth date,
  gender text,
  current_belt text,
  package_code text NOT NULL CHECK (package_code IN ('single_13','single_20','combo')),
  package_label text NOT NULL,
  session_dates date[] NOT NULL DEFAULT '{}',
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('paynow','bank_transfer')),
  proof_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending_verification',
  collected boolean NOT NULL DEFAULT false,
  collected_at timestamptz,
  collected_by text,
  matched_student_id uuid REFERENCES public.students(id),
  matched_invoice_id uuid REFERENCES public.invoices(id),
  notes text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sem_subs_branch ON public.seminar_payment_submissions(branch_id);
CREATE INDEX IF NOT EXISTS idx_sem_subs_status ON public.seminar_payment_submissions(status);

GRANT INSERT, SELECT ON public.seminar_payment_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seminar_payment_submissions TO authenticated;
GRANT ALL ON public.seminar_payment_submissions TO service_role;

ALTER TABLE public.seminar_payment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit seminar payment"
  ON public.seminar_payment_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff with branch access can read seminar submissions"
  ON public.seminar_payment_submissions FOR SELECT
  USING (has_branch_access(branch_id));

CREATE POLICY "Staff with branch access can update seminar submissions"
  ON public.seminar_payment_submissions FOR UPDATE
  USING (has_branch_access(branch_id))
  WITH CHECK (has_branch_access(branch_id));

CREATE POLICY "Superadmin can update seminar submissions"
  ON public.seminar_payment_submissions FOR UPDATE
  USING (get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmin can delete seminar submissions"
  ON public.seminar_payment_submissions FOR DELETE
  USING (get_current_user_role() = 'superadmin');

CREATE TRIGGER trg_sem_subs_updated_at
  BEFORE UPDATE ON public.seminar_payment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Submit (public)
CREATE OR REPLACE FUNCTION public.submit_seminar_payment(_row jsonb)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.seminar_payment_submissions (
    first_name, last_name, email, branch_id, date_of_birth,
    gender, current_belt, package_code, package_label, session_dates,
    amount, payment_method, proof_url, status
  )
  VALUES (
    upper(btrim((_row->>'first_name'))),
    upper(btrim((_row->>'last_name'))),
    NULLIF(lower(btrim(_row->>'email')),''),
    (_row->>'branch_id')::text,
    NULLIF(_row->>'date_of_birth','')::date,
    NULLIF(lower(btrim(_row->>'gender')),''),
    NULLIF(_row->>'current_belt',''),
    _row->>'package_code',
    _row->>'package_label',
    COALESCE(
      ARRAY(SELECT (jsonb_array_elements_text(_row->'session_dates'))::date),
      '{}'::date[]
    ),
    (_row->>'amount')::numeric,
    COALESCE(NULLIF(_row->>'payment_method',''), 'paynow'),
    _row->>'proof_url',
    'pending_verification'
  )
  RETURNING seminar_payment_submissions.id, seminar_payment_submissions.reference_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_seminar_payment(jsonb) TO anon, authenticated;

-- Public list
CREATE OR REPLACE FUNCTION public.get_public_seminar_list(p_branch_id text DEFAULT NULL, p_status text DEFAULT NULL)
RETURNS TABLE(
  submission_id uuid,
  branch_id text,
  branch_name text,
  student_name text,
  first_name text,
  last_name text,
  date_of_birth date,
  gender text,
  current_belt text,
  package_code text,
  package_label text,
  session_dates date[],
  amount numeric,
  proof_url text,
  status text,
  paid_status text,
  collected boolean,
  collected_at timestamptz,
  matched_student_id uuid,
  matched_invoice_id uuid,
  invoice_number text,
  reference_number text,
  email text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    s.id, s.branch_id, b.name,
    upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))),
    s.first_name, s.last_name, s.date_of_birth, s.gender, s.current_belt,
    s.package_code, s.package_label, s.session_dates, s.amount, s.proof_url,
    s.status,
    CASE
      WHEN s.status = 'verified' THEN 'paid'
      WHEN s.status = 'rejected' THEN 'rejected'
      ELSE 'pending'
    END,
    s.collected, s.collected_at,
    s.matched_student_id, s.matched_invoice_id, i.invoice_number,
    s.reference_number, s.email, s.created_at
  FROM public.seminar_payment_submissions s
  LEFT JOIN public.branches b ON b.id = s.branch_id
  LEFT JOIN public.invoices i ON i.id = s.matched_invoice_id
  WHERE (p_branch_id IS NULL OR s.branch_id = p_branch_id)
    AND (p_status IS NULL OR
         (p_status = 'paid' AND s.status = 'verified') OR
         (p_status = 'pending' AND s.status = 'pending_verification') OR
         (p_status = 'rejected' AND s.status = 'rejected'))
  ORDER BY s.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_seminar_list(text, text) TO authenticated;

-- Fuzzy match
CREATE OR REPLACE FUNCTION public.find_seminar_submission_student_matches(p_id uuid)
RETURNS TABLE(student_id uuid, student_number text, full_name text, email text, date_of_birth date, branch_id text, current_belt text, score numeric, reason text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  sub record; sub_name text;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  sub_name := upper(btrim(coalesce(sub.first_name,'') || ' ' || coalesce(sub.last_name,'')));

  RETURN QUERY
  WITH scored AS (
    SELECT
      s.id, s.student_number,
      upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')) AS full_name,
      s.email, s.date_of_birth, s.branch_id, s.current_belt,
      similarity(upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), sub_name) AS name_sim,
      (lower(coalesce(s.email,'')) = lower(coalesce(sub.email,'')) AND sub.email IS NOT NULL) AS email_match,
      (s.date_of_birth = sub.date_of_birth AND sub.date_of_birth IS NOT NULL) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (CASE WHEN sc.email_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.3 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.5)::numeric,
    concat_ws(', ',
      CASE WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name ' || round(sc.name_sim * 100)::text || '%' END
    )
  FROM scored sc
  WHERE sc.email_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC LIMIT 25;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_seminar_submission_student_matches(uuid) TO authenticated;

-- Link existing student
CREATE OR REPLACE FUNCTION public.admin_match_seminar_submission(p_id uuid, p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE sub record;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.seminar_payment_submissions
  SET matched_student_id = p_student_id, updated_at = now()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_match_seminar_submission(uuid, uuid) TO authenticated;

-- Create new student from submission details
CREATE OR REPLACE FUNCTION public.admin_import_seminar_submission_student(p_id uuid, p_created_by text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE sub record; v_student_id uuid;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  INSERT INTO public.students (
    first_name, last_name, email, branch_id, date_of_birth,
    gender, current_belt, status, created_by, updated_by
  ) VALUES (
    upper(sub.first_name), upper(sub.last_name), NULLIF(lower(sub.email),''),
    sub.branch_id, sub.date_of_birth, sub.gender, sub.current_belt,
    'trial', p_created_by, p_created_by
  )
  RETURNING id INTO v_student_id;

  UPDATE public.seminar_payment_submissions
  SET matched_student_id = v_student_id, updated_at = now()
  WHERE id = p_id;

  RETURN v_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_import_seminar_submission_student(uuid, text) TO authenticated;

-- Create paid invoice
CREATE OR REPLACE FUNCTION public.admin_create_seminar_invoice(p_id uuid, p_verified_by text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  sub record; v_invoice_id uuid; v_inv_number text;
  v_product_id uuid; v_tax_rate numeric; v_tax numeric;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF sub.matched_student_id IS NULL THEN RAISE EXCEPTION 'Submission must be matched to a student first'; END IF;
  IF sub.status = 'verified' THEN RAISE EXCEPTION 'Submission already verified'; END IF;

  SELECT id, COALESCE(tax_rate, 0) INTO v_product_id, v_tax_rate
  FROM public.products WHERE name = 'Unarmed Combat Seminar' LIMIT 1;
  IF v_product_id IS NULL THEN RAISE EXCEPTION 'Seminar product not configured'; END IF;

  v_inv_number := public._next_invoice_number();
  v_tax := round(sub.amount * v_tax_rate / 100, 2);

  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, status,
    subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due,
    issue_date, due_date, notes, created_by, updated_by
  ) VALUES (
    v_inv_number, sub.matched_student_id, sub.branch_id, 'paid',
    sub.amount, v_tax, 0, sub.amount + v_tax, sub.amount + v_tax, 0,
    CURRENT_DATE, CURRENT_DATE,
    'Imported from public seminar booking ' || sub.reference_number || ' — ' || sub.package_label,
    p_verified_by, p_verified_by
  ) RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
  ) VALUES (
    v_invoice_id, v_product_id, sub.package_label, 1, sub.amount, v_tax_rate, v_tax, sub.amount + v_tax, p_verified_by, p_verified_by
  );

  INSERT INTO public.payments (
    invoice_id, payment_method, amount, payment_date, reference_number,
    proof_of_payment_url, notes, processed_by, created_by, updated_by,
    is_verified, verified_by, verified_at, verification_status
  ) VALUES (
    v_invoice_id, sub.payment_method, sub.amount + v_tax, CURRENT_DATE, sub.reference_number,
    sub.proof_url, 'Imported from public seminar booking', p_verified_by, p_verified_by, p_verified_by,
    true, p_verified_by, now(), 'verified'
  );

  UPDATE public.seminar_payment_submissions
  SET status = 'verified', matched_invoice_id = v_invoice_id,
      reviewed_by = p_verified_by, reviewed_at = now(), updated_at = now()
  WHERE id = p_id;

  RETURN v_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_seminar_invoice(uuid, text) TO authenticated;

-- Reject
CREATE OR REPLACE FUNCTION public.admin_reject_seminar_submission(p_id uuid, p_reason text, p_reviewed_by text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE sub record;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.seminar_payment_submissions
  SET status = 'rejected', notes = coalesce(p_reason, notes),
      reviewed_by = p_reviewed_by, reviewed_at = now(), updated_at = now()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reject_seminar_submission(uuid, text, text) TO authenticated;

-- Collected toggle
CREATE OR REPLACE FUNCTION public.admin_mark_seminar_collected(p_id uuid, p_collected boolean, p_by text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE sub record;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.seminar_payment_submissions
  SET collected = p_collected,
      collected_at = CASE WHEN p_collected THEN now() ELSE NULL END,
      collected_by = CASE WHEN p_collected THEN p_by ELSE NULL END,
      updated_at = now()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mark_seminar_collected(uuid, boolean, text) TO authenticated;

-- Delete + context
CREATE OR REPLACE FUNCTION public.admin_seminar_submission_delete_context(p_id uuid)
RETURNS TABLE(student_name text, invoice_number text, package_label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    upper(btrim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,''))),
    i.invoice_number,
    s.package_label
  FROM public.seminar_payment_submissions s
  LEFT JOIN public.invoices i ON i.id = s.matched_invoice_id
  WHERE s.id = p_id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_seminar_submission_delete_context(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_seminar_submission(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE sub record;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.seminar_payment_submissions WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_seminar_submission(uuid) TO authenticated;
