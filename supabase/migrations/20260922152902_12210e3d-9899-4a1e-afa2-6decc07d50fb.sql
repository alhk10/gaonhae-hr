
ALTER TABLE public.grading_payment_submissions
  ADD COLUMN IF NOT EXISTS amount_net numeric,
  ADD COLUMN IF NOT EXISTS gst_amount numeric;
ALTER TABLE public.competition_payment_submissions
  ADD COLUMN IF NOT EXISTS amount_net numeric,
  ADD COLUMN IF NOT EXISTS gst_amount numeric;
ALTER TABLE public.seminar_payment_submissions
  ADD COLUMN IF NOT EXISTS amount_net numeric,
  ADD COLUMN IF NOT EXISTS gst_amount numeric;
ALTER TABLE public.public_chat_payment_submissions
  ADD COLUMN IF NOT EXISTS amount_net numeric,
  ADD COLUMN IF NOT EXISTS gst_amount numeric;

CREATE OR REPLACE FUNCTION public.gst_rate_for_branch(p_branch_id text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE lower(COALESCE((SELECT b.country FROM public.branches b WHERE b.id = p_branch_id), ''))
    WHEN 'singapore' THEN 0.09
    WHEN 'australia' THEN 0.10
    ELSE 0
  END;
$$;

-- Resolve (net, tax, total) for a public submission amount.
CREATE OR REPLACE FUNCTION public.resolve_public_amount(
  p_branch_id text,
  p_amount numeric,
  p_amount_net numeric DEFAULT NULL,
  p_gst_amount numeric DEFAULT NULL,
  p_price_hint numeric DEFAULT NULL
)
RETURNS TABLE(net numeric, tax numeric, total numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rate numeric := public.gst_rate_for_branch(p_branch_id);
  v_amount numeric := COALESCE(p_amount, 0);
BEGIN
  IF p_amount_net IS NOT NULL THEN
    net := round(p_amount_net, 2);
    tax := round(COALESCE(p_gst_amount, round(p_amount_net * v_rate, 2)), 2);
    total := round(net + tax, 2);
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_price_hint IS NOT NULL AND abs(v_amount - p_price_hint) < 0.01 THEN
    -- Legacy rows stored the fee before GST, but the parent was asked for fee + GST.
    net := round(p_price_hint, 2);
    tax := round(net * v_rate, 2);
    total := round(net + tax, 2);
    RETURN NEXT;
    RETURN;
  END IF;

  net := round(v_amount / (1 + v_rate), 2);
  tax := round(v_amount - net, 2);
  total := round(v_amount, 2);
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gst_rate_for_branch(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_public_amount(text, numeric, numeric, numeric, numeric) TO anon, authenticated, service_role;

-- Public submit RPCs store the fee and GST split explicitly
CREATE OR REPLACE FUNCTION public.submit_grading_payments(_rows jsonb)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  INSERT INTO public.grading_payment_submissions (
    first_name, last_name, email, branch_id, date_of_birth,
    current_belt, resolved_product_id, resolved_grading_slot_id,
    amount, amount_net, gst_amount, payment_method, proof_url, status
  )
  SELECT
    (r->>'first_name')::text,
    (r->>'last_name')::text,
    NULLIF(r->>'email',''),
    (r->>'branch_id')::text,
    (r->>'date_of_birth')::date,
    NULLIF(r->>'current_belt',''),
    NULLIF(r->>'resolved_product_id','')::uuid,
    NULLIF(r->>'resolved_grading_slot_id','')::uuid,
    NULLIF(r->>'amount','')::numeric,
    NULLIF(r->>'amount_net','')::numeric,
    NULLIF(r->>'gst_amount','')::numeric,
    COALESCE(NULLIF(r->>'payment_method',''), 'paynow'),
    NULLIF(r->>'proof_url',''),
    COALESCE(NULLIF(r->>'status',''), 'pending_verification')
  FROM jsonb_array_elements(_rows) AS r
  RETURNING grading_payment_submissions.id, grading_payment_submissions.reference_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_competition_payment(_row jsonb)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref text := NULLIF(btrim(_row->>'client_ref'), '');
  v_id uuid;
  v_number text;
BEGIN
  IF v_ref IS NOT NULL THEN
    SELECT s.id, s.reference_number INTO v_id, v_number
    FROM public.competition_payment_submissions s
    WHERE s.client_ref = v_ref
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN QUERY SELECT v_id, v_number;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  INSERT INTO public.competition_payment_submissions (
    first_name, last_name, email, branch_id, date_of_birth,
    current_belt,
    amount, amount_net, gst_amount, payment_method, proof_url, certificate_url, status,
    event_id, gender, signature_url, indemnity_form_url, passport_url, photo_url,
    coaching_label, coaching_amount, extra_lines, client_ref
  )
  VALUES (
    upper(btrim((_row->>'first_name'))),
    upper(btrim((_row->>'last_name'))),
    NULLIF(lower(btrim(_row->>'email')),''),
    (_row->>'branch_id')::text,
    NULLIF(_row->>'date_of_birth','')::date,
    NULLIF(_row->>'current_belt',''),
    NULLIF(_row->>'amount','')::numeric,
    NULLIF(_row->>'amount_net','')::numeric,
    NULLIF(_row->>'gst_amount','')::numeric,
    COALESCE(NULLIF(_row->>'payment_method',''), 'paynow'),
    _row->>'proof_url',
    NULLIF(_row->>'certificate_url',''),
    'pending_verification',
    NULLIF(_row->>'event_id','')::uuid,
    NULLIF(lower(btrim(_row->>'gender')),''),
    NULLIF(_row->>'signature_url',''),
    NULLIF(_row->>'indemnity_form_url',''),
    NULLIF(_row->>'passport_url',''),
    NULLIF(_row->>'photo_url',''),
    NULLIF(_row->>'coaching_label',''),
    NULLIF(_row->>'coaching_amount','')::numeric,
    COALESCE(_row->'extra_lines', '[]'::jsonb),
    v_ref
  )
  RETURNING competition_payment_submissions.id, competition_payment_submissions.reference_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_seminar_payment(_row jsonb)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref text := NULLIF(btrim(_row->>'client_ref'), '');
  v_id uuid;
  v_number text;
BEGIN
  IF v_ref IS NOT NULL THEN
    SELECT s.id, s.reference_number INTO v_id, v_number
    FROM public.seminar_payment_submissions s
    WHERE s.client_ref = v_ref
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN QUERY SELECT v_id, v_number;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  INSERT INTO public.seminar_payment_submissions (
    first_name, last_name, email, branch_id, date_of_birth,
    gender, current_belt, package_code, package_label, session_dates,
    amount, amount_net, gst_amount, discount_amount, payment_method, proof_url, status, event_id,
    passport_url, photo_url, grading_card_urls, signature_url, indemnity_form_url,
    client_ref
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
    NULLIF(_row->>'amount_net','')::numeric,
    NULLIF(_row->>'gst_amount','')::numeric,
    COALESCE(NULLIF(_row->>'discount_amount','')::numeric, 0),
    COALESCE(NULLIF(_row->>'payment_method',''), 'paynow'),
    _row->>'proof_url',
    'pending_verification',
    NULLIF(_row->>'event_id','')::uuid,
    NULLIF(_row->>'passport_url',''),
    NULLIF(_row->>'photo_url',''),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(_row->'grading_card_urls')),
      '{}'::text[]
    ),
    NULLIF(_row->>'signature_url',''),
    NULLIF(_row->>'indemnity_form_url',''),
    v_ref
  )
  RETURNING seminar_payment_submissions.id, seminar_payment_submissions.reference_number;
END;
$function$;

-- Imports build invoices as fee + GST, with the total equal to the money collected
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
  v_price_hint numeric;
  v_rate numeric;
  v_net numeric;
  v_tax numeric;
  v_total numeric;
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

  SELECT COALESCE(pr.price_override, v_product.base_price) INTO v_price_hint
  FROM public.products p
  LEFT JOIN public.price_rules pr
    ON pr.product_id = p.id AND pr.branch_id = sub.branch_id AND COALESCE(pr.is_active, true)
  WHERE p.id = v_product.id;

  v_rate := public.gst_rate_for_branch(sub.branch_id);

  SELECT r.net, r.tax, r.total INTO v_net, v_tax, v_total
  FROM public.resolve_public_amount(
    sub.branch_id,
    COALESCE(sub.amount, v_price_hint, 0),
    sub.amount_net,
    sub.gst_amount,
    v_price_hint
  ) r;

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
    v_net, v_tax, 0, v_total, v_total, 0,
    CURRENT_DATE, CURRENT_DATE,
    'Imported from public grading submission ' || sub.reference_number,
    p_verified_by, p_verified_by
  ) RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
  ) VALUES (
    v_invoice_id, v_product.id, v_product.name, 1, v_net, round(v_rate * 100, 2), v_tax, v_net, p_verified_by, p_verified_by
  ) RETURNING id INTO v_invoice_item_id;

  INSERT INTO public.payments (
    invoice_id, payment_method, amount, payment_date, reference_number,
    proof_of_payment_url, notes, processed_by, created_by, updated_by,
    is_verified, verified_by, verified_at, verification_status
  ) VALUES (
    v_invoice_id, sub.payment_method, v_total, CURRENT_DATE, sub.reference_number,
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
      amount_net = COALESCE(amount_net, v_net),
      gst_amount = COALESCE(gst_amount, v_tax),
      amount = v_total,
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
  v_gross_total numeric := 0;
  v_event_name text;
  v_main_amount numeric;
  v_line jsonb;
  v_label text;
  v_amount numeric;
  v_product_id uuid;
  v_gap numeric;
  v_rate numeric;
  v_net numeric;
  v_tax numeric;
  v_total numeric;
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

  v_product_id := COALESCE(
    sub.coaching_product_id,
    ev.coaching_product_id,
    (SELECT id FROM public.products WHERE name = 'Competition Registration' LIMIT 1)
  );
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Competition product not configured';
  END IF;

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
      v_invoice_id, v_product_id, v_event_name, 1, v_main_amount, round(v_rate * 100, 2), 0, v_main_amount, p_verified_by, p_verified_by
    );
    v_gross_total := v_gross_total + v_main_amount;
  END IF;

  IF jsonb_typeof(COALESCE(sub.extra_lines, '[]'::jsonb)) = 'array' THEN
    FOR v_line IN SELECT * FROM jsonb_array_elements(sub.extra_lines) LOOP
      v_label := NULLIF(btrim(coalesce(v_line->>'label','')),'');
      v_amount := COALESCE(NULLIF(v_line->>'amount','')::numeric, 0);
      IF v_amount > 0 OR v_label IS NOT NULL THEN
        INSERT INTO public.invoice_items (
          invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
        ) VALUES (
          v_invoice_id, v_product_id,
          v_event_name || COALESCE(' - ' || v_label, ''),
          1, v_amount, round(v_rate * 100, 2), 0, v_amount,
          p_verified_by, p_verified_by
        );
        v_gross_total := v_gross_total + v_amount;
      END IF;
    END LOOP;
  END IF;

  -- Fallback: submissions without a fee breakdown only carry a single total amount.
  v_gap := round(COALESCE(sub.amount, 0) - v_gross_total, 2);
  IF v_gap > 0 THEN
    INSERT INTO public.invoice_items (
      invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by, updated_by
    ) VALUES (
      v_invoice_id, v_product_id, v_event_name, 1, v_gap, round(v_rate * 100, 2), 0, v_gap, p_verified_by, p_verified_by
    );
    v_gross_total := v_gross_total + v_gap;
  END IF;

  IF abs(v_gross_total - v_total) >= 0.01 THEN
    -- Breakdown lines disagree with the collected amount: trust the collected amount.
    SELECT r.net, r.tax, r.total INTO v_net, v_tax, v_total
    FROM public.resolve_public_amount(sub.branch_id, v_gross_total, NULL, NULL, NULL) r;
  END IF;

  UPDATE public.invoices
  SET subtotal = v_net,
      tax_amount = v_tax,
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
      amount_net = COALESCE(amount_net, v_net),
      gst_amount = COALESCE(gst_amount, v_tax),
      reviewed_by = p_verified_by,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_id;

  RETURN v_invoice_id;
END;
$function$;
