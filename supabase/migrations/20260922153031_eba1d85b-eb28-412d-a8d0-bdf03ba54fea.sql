
CREATE OR REPLACE FUNCTION public.admin_create_seminar_invoice(p_id uuid, p_verified_by text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sub record; v_invoice_id uuid; v_inv_number text; v_product_id uuid;
  v_rate numeric; v_net numeric; v_tax numeric; v_total numeric;
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

  v_rate := public.gst_rate_for_branch(sub.branch_id);
  SELECT r.net, r.tax, r.total INTO v_net, v_tax, v_total
  FROM public.resolve_public_amount(sub.branch_id, COALESCE(sub.amount, 0), sub.amount_net, sub.gst_amount, NULL) r;

  v_inv_number := public._next_invoice_number();

  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, status,
    subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due,
    issue_date, due_date, notes, created_by, updated_by
  ) VALUES (
    v_inv_number, sub.matched_student_id, sub.branch_id, 'paid',
    v_net, v_tax, 0, v_total, v_total, 0,
    CURRENT_DATE, CURRENT_DATE,
    'Imported from public seminar booking ' || sub.reference_number || ' — ' || sub.package_label,
    p_verified_by, p_verified_by
  ) RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
  ) VALUES (
    v_invoice_id, v_product_id, sub.package_label, 1, v_net, round(v_rate * 100, 2), v_tax, v_net, p_verified_by, p_verified_by
  );

  INSERT INTO public.payments (
    invoice_id, payment_method, amount, payment_date, reference_number,
    proof_of_payment_url, notes, processed_by, created_by, updated_by,
    is_verified, verified_by, verified_at, verification_status
  ) VALUES (
    v_invoice_id, sub.payment_method, v_total, CURRENT_DATE, sub.reference_number,
    sub.proof_url, 'Imported from public seminar booking', p_verified_by, p_verified_by, p_verified_by,
    true, p_verified_by, now(), 'verified'
  );

  UPDATE public.seminar_payment_submissions
  SET status = 'verified', matched_invoice_id = v_invoice_id,
      amount_net = COALESCE(amount_net, v_net),
      gst_amount = COALESCE(gst_amount, v_tax),
      reviewed_by = p_verified_by, reviewed_at = now(), updated_at = now()
  WHERE id = p_id;

  RETURN v_invoice_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_match_school_fees_submission(p_id uuid, p_student_id uuid, p_matched_by text DEFAULT 'admin'::text)
RETURNS TABLE(invoice_id uuid, invoice_number text, payment_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sub public.public_chat_payment_submissions;
  v_invoice_id uuid;
  v_invoice_number text;
  v_payment_number text;
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_unit numeric;
  v_line_total numeric;
  v_base_total numeric := 0;
  v_paid_total numeric;
  v_adjustment numeric := 0;
  v_adjustment_product_id uuid;
  v_branch_country text;
  v_rate numeric;
  v_net numeric;
  v_tax numeric;
  v_total numeric;
BEGIN
  SELECT * INTO sub FROM public.public_chat_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'School fees submission % not found', p_id; END IF;
  IF sub.matched_student_id IS NOT NULL AND public._resolve_chat_submission_invoice(sub) IS NOT NULL THEN
    RAISE EXCEPTION 'Submission is already matched to a student with an invoice';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = p_student_id) THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  SELECT b.country INTO v_branch_country FROM public.branches b WHERE b.id = sub.branch_id;
  v_rate := public.gst_rate_for_branch(sub.branch_id);

  SELECT p.id INTO v_adjustment_product_id
  FROM public.products p WHERE p.sku = 'PUBLIC-HELLO-SG-ADJUSTMENT' LIMIT 1;

  v_paid_total := COALESCE(sub.amount, 0);
  v_invoice_number := public._next_invoice_number();

  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, status,
    subtotal, tax_amount, discount_amount, total_amount,
    amount_paid, balance_due, issue_date, due_date,
    notes, internal_notes, created_by, updated_by
  ) VALUES (
    v_invoice_number, p_student_id, sub.branch_id, 'paid',
    0, 0, 0, 0, 0, 0, CURRENT_DATE, CURRENT_DATE,
    'Public school fees payment',
    format('source=public_fees; submission=%s', sub.id),
    'public_fees', 'public_fees'
  ) RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(sub.items, '[]'::jsonb))
  LOOP
    SELECT p.id, p.name, p.metadata INTO v_product
    FROM public.products p WHERE p.id = (v_item->>'product_id')::uuid;
    CONTINUE WHEN v_product.id IS NULL;

    v_qty := GREATEST(COALESCE((v_item->>'qty')::integer, 1), 1);
    v_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_line_total := round(v_unit * v_qty, 2);
    v_base_total := v_base_total + v_line_total;

    INSERT INTO public.invoice_items (
      invoice_id, product_id, description, quantity, unit_price,
      tax_rate, tax_amount, total_amount, metadata, created_by, updated_by
    ) VALUES (
      v_invoice_id,
      v_product.id,
      CASE WHEN v_item->>'term_name' IS NOT NULL
        THEN v_product.name || ' — ' || (v_item->>'term_name')
        ELSE v_product.name END,
      v_qty,
      v_unit,
      round(v_rate * 100, 2), 0,
      v_line_total,
      jsonb_build_object(
        'source', 'public_fees',
        'term_id', v_item->>'term_id',
        'term_name', v_item->>'term_name'
      ),
      'public_fees', 'public_fees'
    );
  END LOOP;

  v_adjustment := round(v_paid_total - v_base_total, 2);

  IF abs(v_adjustment) >= 0.01 AND v_adjustment_product_id IS NOT NULL THEN
    INSERT INTO public.invoice_items (
      invoice_id, product_id, description, quantity, unit_price,
      tax_rate, tax_amount, total_amount, metadata, created_by, updated_by
    ) VALUES (
      v_invoice_id,
      v_adjustment_product_id,
      CASE WHEN lower(COALESCE(v_branch_country, '')) = 'singapore'
        THEN 'Price adjustment'
        ELSE 'Public fees price adjustment' END,
      1, v_adjustment, round(v_rate * 100, 2), 0, v_adjustment,
      jsonb_build_object('source', 'public_fees', 'reason', 'customer_display_price_adjustment'),
      'public_fees', 'public_fees'
    );
  END IF;

  SELECT r.net, r.tax, r.total INTO v_net, v_tax, v_total
  FROM public.resolve_public_amount(sub.branch_id, v_paid_total, sub.amount_net, sub.gst_amount, NULL) r;

  UPDATE public.invoices
  SET subtotal = v_net,
      tax_amount = v_tax,
      discount_amount = 0,
      total_amount = v_total,
      amount_paid = v_total,
      balance_due = 0,
      updated_at = now(),
      updated_by = p_matched_by
  WHERE id = v_invoice_id;

  v_payment_number := public.generate_payment_number();

  INSERT INTO public.payments (
    invoice_id, payment_number, payment_method, amount, payment_date,
    reference_number, proof_of_payment_url, notes, processed_by,
    is_verified, verification_status, created_by, updated_by
  ) VALUES (
    v_invoice_id, v_payment_number, COALESCE(sub.payment_method, 'bank_transfer'),
    v_total, CURRENT_DATE, COALESCE(sub.reference_number, v_invoice_number),
    sub.proof_url,
    'Public /fees payment pending verification',
    'public_fees', false, 'pending_verification', 'public_fees', 'public_fees'
  );

  UPDATE public.public_chat_payment_submissions
  SET matched_student_id = p_student_id,
      matched_invoice_id = v_invoice_id,
      amount_net = COALESCE(amount_net, v_net),
      gst_amount = COALESCE(gst_amount, v_tax),
      notes = COALESCE(notes, '') || format(E'\nMatched by %s at %s', p_matched_by, now())
  WHERE id = p_id;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_payment_number;
END;
$function$;
