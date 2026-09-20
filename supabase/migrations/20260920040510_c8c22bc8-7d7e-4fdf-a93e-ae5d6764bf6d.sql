CREATE OR REPLACE FUNCTION public.admin_create_seminar_invoice(p_id uuid, p_verified_by text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub record; v_invoice_id uuid; v_inv_number text; v_product_id uuid;
BEGIN
  SELECT * INTO sub FROM public.seminar_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF sub.matched_student_id IS NULL THEN RAISE EXCEPTION 'Submission must be matched to a student first'; END IF;
  IF COALESCE(sub.status,'') NOT IN ('verified','paid') THEN
    RAISE EXCEPTION 'Payment must be verified before an invoice can be created';
  END IF;
  IF sub.matched_invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Submission already imported as invoice %', sub.matched_invoice_id;
  END IF;

  SELECT id INTO v_product_id FROM public.products WHERE name = 'Unarmed Combat Seminar' LIMIT 1;
  IF v_product_id IS NULL THEN RAISE EXCEPTION 'Seminar product not configured'; END IF;

  v_inv_number := public._next_invoice_number();

  -- sub.amount is the total collected (GST inclusive where applicable);
  -- the GST split is derived by the invoice GST triggers.
  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, status,
    subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due,
    issue_date, due_date, notes, created_by, updated_by
  ) VALUES (
    v_inv_number, sub.matched_student_id, sub.branch_id, 'paid',
    sub.amount, 0, 0, sub.amount, sub.amount, 0,
    CURRENT_DATE, CURRENT_DATE,
    'Imported from public seminar booking ' || sub.reference_number || ' — ' || sub.package_label,
    p_verified_by, p_verified_by
  ) RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
  ) VALUES (
    v_invoice_id, v_product_id, sub.package_label, 1, sub.amount, 0, 0, sub.amount, p_verified_by, p_verified_by
  );

  INSERT INTO public.payments (
    invoice_id, payment_method, amount, payment_date, reference_number,
    proof_of_payment_url, notes, processed_by, created_by, updated_by,
    is_verified, verified_by, verified_at, verification_status
  ) VALUES (
    v_invoice_id, sub.payment_method, sub.amount, CURRENT_DATE, sub.reference_number,
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