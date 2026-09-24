-- 1. client_ref columns + unique partial indexes
ALTER TABLE public.grading_payment_submissions ADD COLUMN IF NOT EXISTS client_ref text;
ALTER TABLE public.guards_purchases ADD COLUMN IF NOT EXISTS client_ref text;
ALTER TABLE public.public_chat_payment_submissions ADD COLUMN IF NOT EXISTS client_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS grading_payment_submissions_client_ref_key
  ON public.grading_payment_submissions (client_ref) WHERE client_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS guards_purchases_client_ref_key
  ON public.guards_purchases (client_ref) WHERE client_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS public_chat_payment_submissions_client_ref_key
  ON public.public_chat_payment_submissions (client_ref) WHERE client_ref IS NOT NULL;

-- 2. Idempotent grading submission
CREATE OR REPLACE FUNCTION public.submit_grading_payments(_rows jsonb)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r jsonb;
  v_id uuid;
  v_ref text;
  v_client_ref text;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(_rows)
  LOOP
    v_client_ref := NULLIF(r->>'client_ref', '');
    IF v_client_ref IS NOT NULL THEN
      SELECT s.id, s.reference_number INTO v_id, v_ref
      FROM public.grading_payment_submissions s
      WHERE s.client_ref = v_client_ref
      LIMIT 1;
      IF v_id IS NOT NULL THEN
        id := v_id; reference_number := v_ref; RETURN NEXT; CONTINUE;
      END IF;
    END IF;

    INSERT INTO public.grading_payment_submissions (
      first_name, last_name, email, branch_id, date_of_birth,
      current_belt, resolved_product_id, resolved_grading_slot_id,
      amount, amount_net, gst_amount, payment_method, proof_url, status, client_ref
    ) VALUES (
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
      COALESCE(NULLIF(r->>'status',''), 'pending_verification'),
      v_client_ref
    )
    RETURNING grading_payment_submissions.id, grading_payment_submissions.reference_number
    INTO v_id, v_ref;

    id := v_id; reference_number := v_ref; RETURN NEXT;
  END LOOP;
END;
$function$;

-- 3. Idempotent guards purchase
CREATE OR REPLACE FUNCTION public.submit_guards_purchase(_row jsonb)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _new_id uuid;
  _ref text;
  _client_ref text;
BEGIN
  _client_ref := NULLIF(_row->>'client_ref', '');
  IF _client_ref IS NOT NULL THEN
    SELECT g.id, g.reference_number INTO _new_id, _ref
    FROM public.guards_purchases g
    WHERE g.client_ref = _client_ref
    LIMIT 1;
    IF _new_id IS NOT NULL THEN
      id := _new_id; reference_number := _ref; RETURN NEXT; RETURN;
    END IF;
  END IF;

  INSERT INTO public.guards_purchases (
    first_name, last_name, date_of_birth, branch_id, gender, current_belt,
    email, phone, items, subtotal, gst_amount, total, payment_method,
    proof_url, variant_selections, sale_status, client_ref
  ) VALUES (
    NULLIF(_row->>'first_name',''),
    NULLIF(_row->>'last_name',''),
    NULLIF(_row->>'date_of_birth','')::date,
    NULLIF(_row->>'branch_id',''),
    NULLIF(_row->>'gender',''),
    NULLIF(_row->>'current_belt',''),
    NULLIF(_row->>'email',''),
    NULLIF(_row->>'phone',''),
    COALESCE(_row->'items', '[]'::jsonb),
    COALESCE((_row->>'subtotal')::numeric, 0),
    COALESCE((_row->>'gst_amount')::numeric, 0),
    COALESCE((_row->>'total')::numeric, 0),
    NULLIF(_row->>'payment_method',''),
    NULLIF(_row->>'proof_url',''),
    COALESCE(_row->'variant_selections', '{}'::jsonb),
    'pending_verification',
    _client_ref
  )
  RETURNING guards_purchases.id, guards_purchases.reference_number
  INTO _new_id, _ref;

  id := _new_id;
  reference_number := _ref;
  RETURN NEXT;
END;
$function$;

-- 4. /hello chat invoice: one invoice per chat session (idempotent on retry)
CREATE OR REPLACE FUNCTION public.submit_public_chat_invoice(p_session_id uuid, p_student_id uuid, p_branch_id text, p_category text, p_items jsonb, p_amount numeric, p_payment_method text, p_proof_url text)
RETURNS TABLE(invoice_id uuid, invoice_number text, payment_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id uuid;
  v_invoice_number text;
  v_payment_number text;
  v_branch_country text;
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_customer_unit numeric;
  v_line_total numeric;
  v_discount numeric;
  v_plan text;
  v_subtotal numeric := 0;
  v_discount_total numeric := 0;
  v_net_total numeric := 0;
  v_tax_amount numeric := 0;
  v_grand_total numeric := 0;
  v_size_variant text;
  v_grading_slot_id uuid;
  v_term_id uuid;
  v_term_name text;
  v_available_credit numeric := 0;
  v_credit_used numeric := 0;
  v_remaining numeric := 0;
  v_tax_rate numeric := 0;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;

  -- Idempotency: a chat session can only ever produce one invoice.
  SELECT i.id, i.invoice_number INTO v_invoice_id, v_invoice_number
  FROM public.invoices i
  WHERE i.created_by = 'public_hello_chat'
    AND i.internal_notes LIKE '%session=' || p_session_id::text || '%'
  ORDER BY i.created_at DESC
  LIMIT 1;
  IF v_invoice_id IS NOT NULL THEN
    SELECT p.payment_number INTO v_payment_number
    FROM public.payments p
    WHERE p.invoice_id = v_invoice_id
    ORDER BY p.created_at DESC
    LIMIT 1;
    RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_payment_number;
    RETURN;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No payment items provided';
  END IF;

  SELECT b.country INTO v_branch_country
  FROM public.branches b
  WHERE b.id = p_branch_id;

  v_tax_rate := CASE lower(COALESCE(v_branch_country, ''))
    WHEN 'singapore' THEN 0.09
    WHEN 'australia' THEN 0.10
    ELSE 0
  END;

  v_invoice_number := public._next_invoice_number();

  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, status,
    subtotal, tax_amount, discount_amount, total_amount,
    amount_paid, balance_due, issue_date, due_date,
    notes, internal_notes, created_by, updated_by
  ) VALUES (
    v_invoice_number, p_student_id, p_branch_id, 'paid',
    0, 0, 0, 0,
    0, 0, CURRENT_DATE, CURRENT_DATE,
    format('Public hello chat payment: %s', p_category),
    format('source=public_hello_chat; pending verification; session=%s', p_session_id),
    'public_hello_chat', 'public_hello_chat'
  ) RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := GREATEST(COALESCE((v_item->>'qty')::integer, 1), 1);
    v_customer_unit := GREATEST(COALESCE((v_item->>'unit_price')::numeric, 0), 0);
    v_discount := GREATEST(COALESCE((v_item->>'discount')::numeric, 0), 0);
    v_plan := NULLIF(v_item->>'payment_plan', '');
    v_grading_slot_id := NULLIF(v_item->>'grading_slot_id', '')::uuid;
    v_term_id := NULLIF(v_item->>'term_id', '')::uuid;
    v_term_name := NULLIF(v_item->>'term_name', '');

    SELECT p.id, p.name, COALESCE(p.metadata, '{}'::jsonb) AS metadata
    INTO v_product
    FROM public.products p
    WHERE p.id = NULLIF(v_item->>'product_id', '')::uuid
    LIMIT 1;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Invalid product in cart';
    END IF;

    v_line_total := round(v_customer_unit * v_qty, 2);
    v_discount := LEAST(v_discount, v_line_total);
    v_subtotal := v_subtotal + v_line_total;
    v_discount_total := v_discount_total + v_discount;
    v_size_variant := NULLIF(COALESCE(v_item->>'size_variant', v_item->>'size', v_item->>'variant'), '');

    INSERT INTO public.invoice_items (
      invoice_id, product_id, size_variant, description, quantity, unit_price,
      tax_rate, tax_amount, total_amount, metadata, created_by, updated_by
    ) VALUES (
      v_invoice_id,
      v_product.id,
      v_size_variant,
      CASE WHEN v_term_name IS NOT NULL THEN v_product.name || ' — ' || v_term_name ELSE v_product.name END,
      v_qty,
      v_customer_unit,
      round(v_tax_rate * 100, 2),
      round((v_line_total - v_discount) * v_tax_rate, 2),
      v_line_total,
      jsonb_build_object(
        'source', 'public_hello_chat',
        'customer_unit_price', v_customer_unit,
        'customer_line_total', v_line_total - v_discount,
        'grading_slot_id', v_grading_slot_id,
        'term_id', v_term_id,
        'term_name', v_term_name,
        'payment_plan', v_plan,
        'weeks', v_qty,
        'plan_discount', v_discount,
        'selected_options', COALESCE(v_item->'selected_options', '{}'::jsonb),
        'product_metadata', v_product.metadata,
        'tax_inclusive', false
      ),
      'public_hello_chat',
      'public_hello_chat'
    );
  END LOOP;

  v_net_total := GREATEST(round(v_subtotal - v_discount_total, 2), 0);
  v_tax_amount := round(v_net_total * v_tax_rate, 2);
  v_grand_total := round(v_net_total + v_tax_amount, 2);

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      tax_amount = v_tax_amount,
      discount_amount = v_discount_total,
      total_amount = v_grand_total,
      amount_paid = v_grand_total,
      balance_due = 0,
      updated_at = now(),
      updated_by = 'public_hello_chat'
  WHERE id = v_invoice_id;

  PERFORM pg_advisory_xact_lock(hashtextextended('student_credit:' || p_student_id::text, 0));

  v_available_credit := GREATEST(COALESCE(public.get_student_available_credit(p_student_id), 0), 0);
  v_credit_used := round(LEAST(v_available_credit, v_grand_total), 2);
  v_remaining := round(v_grand_total - v_credit_used, 2);

  IF v_remaining > 0 AND p_payment_method NOT IN ('paynow', 'bank_transfer') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF v_credit_used > 0 THEN
    INSERT INTO public.student_credits (student_id, amount, type, reference_id, description, created_by)
    VALUES (
      p_student_id,
      -v_credit_used,
      'credit_hold',
      v_invoice_id::text,
      format('Credit on hold for Invoice #%s (pending verification)', v_invoice_number),
      'public_hello_chat'
    );

    v_payment_number := public.generate_payment_number();
    INSERT INTO public.payments (
      invoice_id, payment_number, payment_method, amount, payment_date,
      reference_number, proof_of_payment_url, notes, processed_by,
      is_verified, verification_status, created_by, updated_by
    ) VALUES (
      v_invoice_id,
      v_payment_number,
      'credit',
      v_credit_used,
      CURRENT_DATE,
      v_invoice_number,
      NULL,
      format('Student credit applied (on hold until verification); session=%s', p_session_id),
      'public_hello_chat',
      false,
      'pending',
      'public_hello_chat',
      'public_hello_chat'
    );
  END IF;

  IF v_remaining > 0 THEN
    v_payment_number := public.generate_payment_number();

    INSERT INTO public.payments (
      invoice_id, payment_number, payment_method, amount, payment_date,
      reference_number, proof_of_payment_url, notes, processed_by,
      is_verified, verification_status, created_by, updated_by
    ) VALUES (
      v_invoice_id,
      v_payment_number,
      p_payment_method,
      v_remaining,
      CURRENT_DATE,
      v_invoice_number,
      p_proof_url,
      format('Public hello chat payment pending verification; session=%s', p_session_id),
      'public_hello_chat',
      false,
      'pending',
      'public_hello_chat',
      'public_hello_chat'
    );
  END IF;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_payment_number;
END;
$function$;

-- 5. update_public_submission: also update contact email / phone
CREATE OR REPLACE FUNCTION public.update_public_submission(p_source text, p_record_id uuid, p_amount numeric DEFAULT NULL::numeric, p_proof_url text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_email text;
  v_phone text;
BEGIN
  v_email := NULLIF(btrim(COALESCE(p_email, '')), '');
  v_phone := NULLIF(btrim(COALESCE(p_phone, '')), '');

  IF p_source = 'grading' THEN
    SELECT status INTO v_status FROM public.grading_payment_submissions WHERE id = p_record_id;
  ELSIF p_source = 'competition' THEN
    SELECT status INTO v_status FROM public.competition_payment_submissions WHERE id = p_record_id;
  ELSIF p_source = 'seminar' THEN
    SELECT status INTO v_status FROM public.seminar_payment_submissions WHERE id = p_record_id;
  ELSIF p_source = 'guards' THEN
    SELECT sale_status INTO v_status FROM public.guards_purchases WHERE id = p_record_id;
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
           proof_url = coalesce(nullif(btrim(coalesce(p_proof_url,'')),''), proof_url),
           email = coalesce(v_email, email),
           updated_at = now()
     WHERE id = p_record_id;
  ELSIF p_source = 'competition' THEN
    UPDATE public.competition_payment_submissions
       SET amount = coalesce(p_amount, amount),
           proof_url = coalesce(nullif(btrim(coalesce(p_proof_url,'')),''), proof_url),
           email = coalesce(v_email, email),
           updated_at = now()
     WHERE id = p_record_id;
  ELSIF p_source = 'seminar' THEN
    UPDATE public.seminar_payment_submissions
       SET amount = coalesce(p_amount, amount),
           proof_url = coalesce(nullif(btrim(coalesce(p_proof_url,'')),''), proof_url),
           email = coalesce(v_email, email),
           updated_at = now()
     WHERE id = p_record_id;
  ELSIF p_source = 'guards' THEN
    UPDATE public.guards_purchases
       SET total = coalesce(p_amount, total),
           proof_url = coalesce(nullif(btrim(coalesce(p_proof_url,'')),''), proof_url),
           email = coalesce(v_email, email),
           phone = coalesce(v_phone, phone),
           updated_at = now()
     WHERE id = p_record_id;
  END IF;
END;
$function$;

-- 6. Submission edit requests (verified records: parent requests a correction, superadmin approves)
CREATE TABLE public.submission_edit_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  record_id uuid NOT NULL,
  student_name text,
  reference_number text,
  amount numeric,
  proposed_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  requested_by text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.submission_edit_requests TO authenticated;
GRANT ALL ON public.submission_edit_requests TO service_role;
ALTER TABLE public.submission_edit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read submission edit requests"
  ON public.submission_edit_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage submission edit requests"
  ON public.submission_edit_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.submit_submission_edit_request(p_source text, p_record_id uuid, p_student_name text DEFAULT NULL::text, p_reference_number text DEFAULT NULL::text, p_amount numeric DEFAULT NULL::numeric, p_proposed_changes jsonb DEFAULT '{}'::jsonb, p_reason text DEFAULT NULL::text, p_requested_by text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_exists boolean;
BEGIN
  IF p_source NOT IN ('grading', 'competition', 'seminar', 'guards', 'school_fees') THEN
    RAISE EXCEPTION 'Unknown source %', p_source;
  END IF;

  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1)',
    CASE p_source
      WHEN 'grading' THEN 'grading_payment_submissions'
      WHEN 'competition' THEN 'competition_payment_submissions'
      WHEN 'seminar' THEN 'seminar_payment_submissions'
      WHEN 'guards' THEN 'guards_purchases'
      WHEN 'school_fees' THEN 'school_fees_submissions'
    END
  ) INTO v_exists USING p_record_id;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  -- One open edit request per record at a time.
  SELECT id INTO v_id FROM public.submission_edit_requests
  WHERE source = p_source AND record_id = p_record_id AND status = 'pending'
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.submission_edit_requests (
    source, record_id, student_name, reference_number, amount,
    proposed_changes, reason, requested_by
  ) VALUES (
    p_source, p_record_id, p_student_name, p_reference_number, p_amount,
    COALESCE(p_proposed_changes, '{}'::jsonb), p_reason, p_requested_by
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_submission_edit_request(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req public.submission_edit_requests%ROWTYPE;
  v_amount numeric;
  v_email text;
  v_phone text;
BEGIN
  SELECT * INTO v_req FROM public.submission_edit_requests WHERE id = p_id;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already reviewed';
  END IF;

  v_amount := NULLIF(v_req.proposed_changes->>'amount', '')::numeric;
  v_email := NULLIF(btrim(COALESCE(v_req.proposed_changes->>'email', '')), '');
  v_phone := NULLIF(btrim(COALESCE(v_req.proposed_changes->>'phone', '')), '');

  IF v_req.source = 'grading' THEN
    UPDATE public.grading_payment_submissions
       SET amount = coalesce(v_amount, amount),
           email = coalesce(v_email, email),
           updated_at = now()
     WHERE id = v_req.record_id;
  ELSIF v_req.source = 'competition' THEN
    UPDATE public.competition_payment_submissions
       SET amount = coalesce(v_amount, amount),
           email = coalesce(v_email, email),
           updated_at = now()
     WHERE id = v_req.record_id;
  ELSIF v_req.source = 'seminar' THEN
    UPDATE public.seminar_payment_submissions
       SET amount = coalesce(v_amount, amount),
           email = coalesce(v_email, email),
           updated_at = now()
     WHERE id = v_req.record_id;
  ELSIF v_req.source = 'guards' THEN
    UPDATE public.guards_purchases
       SET total = coalesce(v_amount, total),
           email = coalesce(v_email, email),
           phone = coalesce(v_phone, phone),
           updated_at = now()
     WHERE id = v_req.record_id;
  ELSIF v_req.source = 'school_fees' THEN
    UPDATE public.school_fees_submissions
       SET amount = coalesce(v_amount, amount),
           email = coalesce(v_email, email),
           updated_at = now()
     WHERE id = v_req.record_id;
  END IF;

  UPDATE public.submission_edit_requests
     SET status = 'approved', reviewed_at = now(), reviewed_by = 'superadmin', updated_at = now()
   WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_submission_edit_request(p_id uuid, p_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.submission_edit_requests
     SET status = 'rejected', reviewed_at = now(), reviewed_by = 'superadmin',
         review_note = p_note, updated_at = now()
   WHERE id = p_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already reviewed';
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_submission_edit_request(text, uuid, text, text, numeric, jsonb, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_submission_edit_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_submission_edit_request(uuid, text) TO authenticated;