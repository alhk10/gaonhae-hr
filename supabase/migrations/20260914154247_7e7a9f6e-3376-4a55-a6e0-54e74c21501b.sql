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
  v_target_belt text;
BEGIN
  SELECT * INTO sub FROM public.grading_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF sub.matched_student_id IS NULL THEN RAISE EXCEPTION 'Submission must be matched to a student first'; END IF;
  IF COALESCE(sub.status,'') NOT IN ('verified','paid') THEN
    RAISE EXCEPTION 'Payment must be verified before an invoice can be created';
  END IF;
  IF sub.matched_invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Submission already imported as invoice %', sub.matched_invoice_id;
  END IF;

  SELECT id, name, base_price INTO v_product FROM public.products WHERE id = sub.resolved_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resolved grading product not found'; END IF;

  v_amount := COALESCE(sub.amount, v_product.base_price, 0);
  v_inv_number := public._next_invoice_number();

  v_target_belt := COALESCE(
    NULLIF(TRIM(SPLIT_PART(v_product.name, '>>', 2)), ''),
    sub.current_belt
  );

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
           v_target_belt,
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

CREATE OR REPLACE FUNCTION public.admin_import_competition_submission(p_id uuid, p_verified_by text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record;
  ev record;
  v_invoice_id uuid;
  v_inv_number text;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_event_name text;
  v_main_amount numeric;
  v_line jsonb;
  v_label text;
  v_amount numeric;
BEGIN
  SELECT * INTO sub FROM public.competition_payment_submissions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF NOT public.has_branch_access(sub.branch_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF sub.matched_student_id IS NULL THEN RAISE EXCEPTION 'Submission must be matched to a student first'; END IF;
  IF COALESCE(sub.status,'') NOT IN ('verified','paid') THEN
    RAISE EXCEPTION 'Payment must be verified before an invoice can be created';
  END IF;
  IF sub.matched_invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Submission already imported as invoice %', sub.matched_invoice_id;
  END IF;

  SELECT * INTO ev FROM public.competition_events WHERE id = sub.event_id;
  v_event_name := COALESCE(ev.name, sub.coaching_label, 'Competition Registration');

  v_inv_number := public._next_invoice_number();

  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, status,
    subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due,
    issue_date, due_date, notes, created_by, updated_by
  ) VALUES (
    v_inv_number, sub.matched_student_id, sub.branch_id, 'paid',
    0, 0, 0, 0, 0, 0,
    CURRENT_DATE, CURRENT_DATE,
    'Imported from public competition submission ' || sub.reference_number,
    p_verified_by, p_verified_by
  ) RETURNING id INTO v_invoice_id;

  v_main_amount := COALESCE(sub.coaching_amount, 0);
  IF v_main_amount > 0 THEN
    INSERT INTO public.invoice_items (
      invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
    ) VALUES (
      v_invoice_id, NULL, v_event_name, 1, v_main_amount, 0, 0, v_main_amount, p_verified_by, p_verified_by
    );
    v_subtotal := v_subtotal + v_main_amount;
    v_total := v_total + v_main_amount;
  END IF;

  IF jsonb_typeof(COALESCE(sub.extra_lines, '[]'::jsonb)) = 'array' THEN
    FOR v_line IN SELECT * FROM jsonb_array_elements(sub.extra_lines) LOOP
      v_label := NULLIF(btrim(coalesce(v_line->>'label','')),'');
      v_amount := COALESCE(NULLIF(v_line->>'amount','')::numeric, 0);
      IF v_amount > 0 OR v_label IS NOT NULL THEN
        INSERT INTO public.invoice_items (
          invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
        ) VALUES (
          v_invoice_id, NULL,
          v_event_name || COALESCE(' - ' || v_label, ''),
          1, v_amount, 0, 0, v_amount,
          p_verified_by, p_verified_by
        );
        v_subtotal := v_subtotal + v_amount;
        v_total := v_total + v_amount;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      tax_amount = 0,
      total_amount = v_total,
      amount_paid = v_total,
      balance_due = 0
  WHERE id = v_invoice_id;

  INSERT INTO public.payments (
    invoice_id, payment_method, amount, payment_date, reference_number,
    proof_of_payment_url, notes, processed_by, created_by, updated_by,
    is_verified, verified_by, verified_at, verification_status
  ) VALUES (
    v_invoice_id, sub.payment_method, v_total, CURRENT_DATE, sub.reference_number,
    sub.proof_url, 'Imported from public competition submission', p_verified_by, p_verified_by, p_verified_by,
    true, p_verified_by, now(), 'verified'
  );

  IF sub.certificate_url IS NOT NULL THEN
    UPDATE public.students
    SET certificate_name = COALESCE(NULLIF(btrim(certificate_name),''), sub.certificate_url)
    WHERE id = sub.matched_student_id;
  END IF;

  UPDATE public.competition_payment_submissions
  SET status = 'verified',
      matched_invoice_id = v_invoice_id,
      reviewed_by = p_verified_by,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_id;

  RETURN v_invoice_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_seminar_invoice(p_id uuid, p_verified_by text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub record; v_invoice_id uuid; v_inv_number text;
  v_product_id uuid; v_tax_rate numeric; v_tax numeric;
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
$function$;