
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Allow branch staff to update submissions for their branch (not just superadmin)
DROP POLICY IF EXISTS "Staff with branch access can update submissions" ON public.grading_payment_submissions;
CREATE POLICY "Staff with branch access can update submissions"
  ON public.grading_payment_submissions
  FOR UPDATE
  USING (public.has_branch_access(branch_id))
  WITH CHECK (public.has_branch_access(branch_id));

-- Fuzzy match candidate students for a submission
CREATE OR REPLACE FUNCTION public.find_grading_submission_student_matches(p_id uuid)
RETURNS TABLE(
  student_id uuid,
  student_number text,
  full_name text,
  email text,
  date_of_birth date,
  branch_id text,
  current_belt text,
  score numeric,
  reason text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub record;
BEGIN
  SELECT * INTO sub FROM public.grading_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      s.id,
      s.student_number,
      upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')) AS full_name,
      s.email,
      s.date_of_birth,
      s.branch_id,
      s.current_belt,
      similarity(upper(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')), upper(coalesce(sub.student_name,''))) AS name_sim,
      (lower(coalesce(s.email,'')) = lower(coalesce(sub.email,'')) AND sub.email IS NOT NULL) AS email_match,
      (s.date_of_birth = sub.date_of_birth AND sub.date_of_birth IS NOT NULL) AS dob_match,
      (s.branch_id = sub.branch_id) AS branch_match
    FROM public.students s
  )
  SELECT
    sc.id, sc.student_number, sc.full_name, sc.email, sc.date_of_birth, sc.branch_id, sc.current_belt,
    (
      CASE WHEN sc.email_match THEN 0.5 ELSE 0 END
      + CASE WHEN sc.dob_match THEN 0.3 ELSE 0 END
      + CASE WHEN sc.branch_match THEN 0.1 ELSE 0 END
      + sc.name_sim * 0.5
    )::numeric AS score,
    concat_ws(', ',
      CASE WHEN sc.email_match THEN 'email match' END,
      CASE WHEN sc.dob_match THEN 'DOB match' END,
      CASE WHEN sc.branch_match THEN 'same branch' END,
      CASE WHEN sc.name_sim >= 0.5 THEN 'name '||round(sc.name_sim*100)::text||'%' END
    ) AS reason
  FROM scored sc
  WHERE sc.email_match OR sc.dob_match OR sc.name_sim >= 0.4
  ORDER BY score DESC
  LIMIT 25;
END;
$$;

-- Match an existing student to a submission
CREATE OR REPLACE FUNCTION public.admin_match_grading_submission(p_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub record;
BEGIN
  SELECT * INTO sub FROM public.grading_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  UPDATE public.grading_payment_submissions
  SET matched_student_id = p_student_id, updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Reject a submission
CREATE OR REPLACE FUNCTION public.admin_reject_grading_submission(p_id uuid, p_reason text, p_reviewed_by text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub record;
BEGIN
  SELECT * INTO sub FROM public.grading_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  UPDATE public.grading_payment_submissions
  SET status = 'rejected',
      notes = coalesce(p_reason, notes),
      reviewed_by = p_reviewed_by,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Generate next invoice number (matches existing pattern INV-YYYYMM-####)
CREATE OR REPLACE FUNCTION public._next_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_period text := to_char(now(), 'YYYYMM');
  next_number integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('invoice-number-' || current_period));
  SELECT COALESCE(
    MAX(COALESCE(NULLIF(substring(invoice_number from '[0-9]+$'), '')::integer, 0)),
    0
  ) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || current_period || '-%';
  RETURN format('INV-%s-%s', current_period, lpad(next_number::text, 4, '0'));
END;
$$;

-- Import a submission into invoice + payment + grading registration
CREATE OR REPLACE FUNCTION public.admin_import_grading_submission(p_id uuid, p_verified_by text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub record;
  v_invoice_id uuid;
  v_invoice_item_id uuid;
  v_payment_id uuid;
  v_product record;
  v_amount numeric;
  v_inv_number text;
BEGIN
  SELECT * INTO sub FROM public.grading_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF sub.matched_student_id IS NULL THEN RAISE EXCEPTION 'Submission must be matched to a student first'; END IF;
  IF sub.status = 'verified' THEN RAISE EXCEPTION 'Submission already verified'; END IF;

  SELECT id, name, base_price INTO v_product FROM public.products WHERE id = sub.resolved_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resolved grading product not found'; END IF;

  v_amount := COALESCE(sub.amount, v_product.base_price, 0);
  v_inv_number := public._next_invoice_number();

  -- Create invoice
  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, status,
    subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due,
    issue_date, due_date, notes, created_by, updated_by
  ) VALUES (
    v_inv_number, sub.matched_student_id, sub.branch_id, 'paid',
    v_amount, 0, 0, v_amount, v_amount, 0,
    CURRENT_DATE, CURRENT_DATE,
    'Imported from public grading submission ' || sub.reference_number,
    p_verified_by, p_verified_by
  ) RETURNING id INTO v_invoice_id;

  -- Create invoice item
  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
  ) VALUES (
    v_invoice_id, v_product.id, v_product.name, 1, v_amount, 0, 0, v_amount, p_verified_by, p_verified_by
  ) RETURNING id INTO v_invoice_item_id;

  -- Create payment (already verified)
  INSERT INTO public.payments (
    invoice_id, payment_method, amount, payment_date, reference_number,
    proof_of_payment_url, notes, processed_by, created_by, updated_by,
    is_verified, verified_by, verified_at, verification_status
  ) VALUES (
    v_invoice_id, sub.payment_method, v_amount, CURRENT_DATE, sub.reference_number,
    sub.proof_url, 'Imported from public grading submission', p_verified_by, p_verified_by, p_verified_by,
    true, p_verified_by, now(), 'verified'
  ) RETURNING id INTO v_payment_id;

  -- Create grading registration if slot resolved
  IF sub.resolved_grading_slot_id IS NOT NULL THEN
    INSERT INTO public.grading_registrations (
      grading_slot_id, student_id, invoice_item_id, current_belt, created_by
    )
    SELECT sub.resolved_grading_slot_id, sub.matched_student_id, v_invoice_item_id,
           sub.current_belt, p_verified_by
    WHERE NOT EXISTS (
      SELECT 1 FROM public.grading_registrations
      WHERE grading_slot_id = sub.resolved_grading_slot_id
        AND student_id = sub.matched_student_id
    );
  END IF;

  -- Update submission
  UPDATE public.grading_payment_submissions
  SET status = 'verified',
      matched_invoice_id = v_invoice_id,
      reviewed_by = p_verified_by,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_id;

  RETURN v_invoice_id;
END;
$$;
