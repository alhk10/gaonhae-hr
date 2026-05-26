CREATE OR REPLACE FUNCTION public.admin_import_grading_submission(p_id uuid, p_verified_by text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
  ) VALUES (
    v_invoice_id, v_product.id, v_product.name, 1, v_amount, 0, 0, v_amount, p_verified_by, p_verified_by
  ) RETURNING id INTO v_invoice_item_id;

  INSERT INTO public.payments (
    invoice_id, payment_method, amount, payment_date, reference_number,
    proof_of_payment_url, notes, processed_by, created_by, updated_by,
    is_verified, verified_by, verified_at, verification_status
  ) VALUES (
    v_invoice_id, sub.payment_method, v_amount, CURRENT_DATE, sub.reference_number,
    sub.proof_url, 'Imported from public grading submission', p_verified_by, p_verified_by, p_verified_by,
    true, p_verified_by, now(), 'verified'
  ) RETURNING id INTO v_payment_id;

  IF sub.resolved_grading_slot_id IS NOT NULL THEN
    INSERT INTO public.grading_registrations (
      grading_slot_id, student_id, invoice_item_id,
      current_belt, target_belt, created_by
    )
    SELECT sub.resolved_grading_slot_id, sub.matched_student_id, v_invoice_item_id,
           sub.current_belt,
           COALESCE(sub.target_belt, sub.current_belt),
           p_verified_by
    WHERE NOT EXISTS (
      SELECT 1 FROM public.grading_registrations
      WHERE grading_slot_id = sub.resolved_grading_slot_id
        AND student_id = sub.matched_student_id
    );
  END IF;

  UPDATE public.grading_payment_submissions
  SET status = 'verified',
      matched_invoice_id = v_invoice_id,
      reviewed_by = p_verified_by,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_id;

  RETURN v_invoice_id;
END;
$function$;