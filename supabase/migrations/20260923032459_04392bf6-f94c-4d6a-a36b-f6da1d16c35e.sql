
CREATE OR REPLACE FUNCTION public.check_public_submission_duplicate(
  p_source text,
  p_branch_id text,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_amount numeric
)
RETURNS TABLE(record_id uuid, reference_number text, status text, amount numeric, created_at timestamptz, editable boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text := upper(btrim(coalesce(p_first_name,'') || ' ' || coalesce(p_last_name,'')));
  v_email text := lower(btrim(coalesce(p_email,'')));
BEGIN
  IF p_source = 'grading' THEN
    RETURN QUERY
      SELECT g.id, g.reference_number, g.status, g.amount, g.created_at,
             (g.status IS DISTINCT FROM 'verified')
        FROM public.grading_payment_submissions g
       WHERE lower(coalesce(g.email,'')) = v_email
         AND upper(coalesce(g.first_name,'')||' '||coalesce(g.last_name,'')) = v_name
         AND coalesce(g.branch_id,'') = coalesce(p_branch_id,'')
         AND coalesce(g.amount,0) = coalesce(p_amount,0)
         AND g.created_at > now() - interval '24 hours'
         AND g.status <> 'rejected'
       ORDER BY g.created_at DESC LIMIT 1;
  ELSIF p_source = 'competition' THEN
    RETURN QUERY
      SELECT c.id, c.reference_number, c.status, c.amount, c.created_at,
             (c.status IS DISTINCT FROM 'verified')
        FROM public.competition_payment_submissions c
       WHERE lower(coalesce(c.email,'')) = v_email
         AND upper(coalesce(c.first_name,'')||' '||coalesce(c.last_name,'')) = v_name
         AND coalesce(c.branch_id,'') = coalesce(p_branch_id,'')
         AND coalesce(c.amount,0) = coalesce(p_amount,0)
         AND c.created_at > now() - interval '24 hours'
         AND c.status <> 'rejected'
       ORDER BY c.created_at DESC LIMIT 1;
  ELSIF p_source = 'seminar' THEN
    RETURN QUERY
      SELECT s.id, s.reference_number, s.status, s.amount, s.created_at,
             (s.status IS DISTINCT FROM 'verified')
        FROM public.seminar_payment_submissions s
       WHERE lower(coalesce(s.email,'')) = v_email
         AND upper(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')) = v_name
         AND coalesce(s.branch_id,'') = coalesce(p_branch_id,'')
         AND coalesce(s.amount,0) = coalesce(p_amount,0)
         AND s.created_at > now() - interval '24 hours'
         AND s.status <> 'rejected'
       ORDER BY s.created_at DESC LIMIT 1;
  ELSIF p_source = 'guards' THEN
    RETURN QUERY
      SELECT gp.id, gp.reference_number, gp.status, gp.total, gp.created_at,
             (gp.status IS DISTINCT FROM 'verified')
        FROM public.guards_purchases gp
       WHERE lower(coalesce(gp.email,'')) = v_email
         AND upper(coalesce(gp.first_name,'')||' '||coalesce(gp.last_name,'')) = v_name
         AND coalesce(gp.branch_id,'') = coalesce(p_branch_id,'')
         AND coalesce(gp.total,0) = coalesce(p_amount,0)
         AND gp.created_at > now() - interval '24 hours'
         AND gp.status <> 'rejected'
       ORDER BY gp.created_at DESC LIMIT 1;
  ELSE
    RAISE EXCEPTION 'Unknown source %', p_source;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_public_submission_duplicate(text, text, text, text, text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.check_public_submission_duplicate(text, text, text, text, text, numeric) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_public_submission(
  p_source text,
  p_record_id uuid,
  p_amount numeric DEFAULT NULL,
  p_proof_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  IF p_source = 'grading' THEN
    SELECT status INTO v_status FROM public.grading_payment_submissions WHERE id = p_record_id;
  ELSIF p_source = 'competition' THEN
    SELECT status INTO v_status FROM public.competition_payment_submissions WHERE id = p_record_id;
  ELSIF p_source = 'seminar' THEN
    SELECT status INTO v_status FROM public.seminar_payment_submissions WHERE id = p_record_id;
  ELSIF p_source = 'guards' THEN
    SELECT status INTO v_status FROM public.guards_purchases WHERE id = p_record_id;
  ELSE
    RAISE EXCEPTION 'Unknown source %', p_source;
  END IF;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;
  IF v_status = 'verified' THEN
    RAISE EXCEPTION 'This payment has already been checked by staff. Please contact your branch to change it.';
  END IF;

  IF p_source = 'grading' THEN
    UPDATE public.grading_payment_submissions
       SET amount = coalesce(p_amount, amount),
           proof_url = coalesce(nullif(btrim(coalesce(p_proof_url,'')),''), proof_url)
     WHERE id = p_record_id;
  ELSIF p_source = 'competition' THEN
    UPDATE public.competition_payment_submissions
       SET amount = coalesce(p_amount, amount),
           proof_url = coalesce(nullif(btrim(coalesce(p_proof_url,'')),''), proof_url)
     WHERE id = p_record_id;
  ELSIF p_source = 'seminar' THEN
    UPDATE public.seminar_payment_submissions
       SET amount = coalesce(p_amount, amount),
           proof_url = coalesce(nullif(btrim(coalesce(p_proof_url,'')),''), proof_url)
     WHERE id = p_record_id;
  ELSIF p_source = 'guards' THEN
    UPDATE public.guards_purchases
       SET total = coalesce(p_amount, total),
           proof_url = coalesce(nullif(btrim(coalesce(p_proof_url,'')),''), proof_url)
     WHERE id = p_record_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_public_submission(text, uuid, numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_public_submission(text, uuid, numeric, text) TO anon, authenticated;
