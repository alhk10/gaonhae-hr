CREATE OR REPLACE FUNCTION public.get_public_payment_options(p_branch_id text, p_current_belt text)
RETURNS TABLE(branch_country text, paynow_qr_url text, bank_transfer_info text, product_id uuid, product_name text, product_price numeric, slot_id uuid, slot_date date, slot_start time without time zone, slot_end time without time zone, slot_location text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_country text;
  v_country_code text;
  v_qr text;
  v_bank text;
  v_product record;
  v_slot record;
BEGIN
  SELECT b.country INTO v_country FROM public.branches b WHERE b.id = p_branch_id;

  v_country_code := CASE lower(trim(COALESCE(v_country, '')))
    WHEN 'singapore' THEN 'sg'
    WHEN 'australia' THEN 'au'
    WHEN 'malaysia' THEN 'my'
    ELSE lower(trim(COALESCE(v_country, '')))
  END;

  SELECT it.paynow_qr_url, it.bank_transfer_info
  INTO v_qr, v_bank
  FROM public.invoice_templates it
  WHERE it.is_active = true
    AND (it.branch_id = p_branch_id OR it.branch_id IS NULL)
    AND (
      it.branch_id = p_branch_id
      OR lower(trim(COALESCE(it.country, ''))) IN (
        v_country_code,
        lower(trim(COALESCE(v_country, '')))
      )
    )
  ORDER BY
    (it.branch_id = p_branch_id) DESC,
    (lower(trim(COALESCE(it.country, ''))) = v_country_code) DESC,
    it.updated_at DESC NULLS LAST
  LIMIT 1;

  IF lower(coalesce(v_country, '')) <> 'singapore' THEN
    v_qr := NULL;
  END IF;

  SELECT p.id, p.name, p.base_price
  INTO v_product
  FROM public.products p
  JOIN public.product_categories pc ON pc.id = p.category_id
  WHERE p.is_active = true
    AND lower(pc.name) = 'grading'
    AND p_current_belt IS NOT NULL
    AND lower(p.name) LIKE lower(p_current_belt || ' >>%')
  ORDER BY length(p.name)
  LIMIT 1;

  SELECT gs.id, gs.grading_date, gs.start_time, gs.end_time, gs.location
  INTO v_slot
  FROM public.grading_slots gs
  WHERE gs.grading_date >= CURRENT_DATE
    AND (gs.status IS NULL OR gs.status <> 'cancelled')
    AND (gs.branch_id = p_branch_id OR p_branch_id = ANY(COALESCE(gs.available_branch_ids, ARRAY[]::text[])))
    AND (p_current_belt IS NULL OR p_current_belt = ANY(COALESCE(gs.belt_levels, ARRAY[]::text[])))
  ORDER BY gs.grading_date, gs.start_time
  LIMIT 1;

  RETURN QUERY SELECT
    v_country, v_qr, v_bank, v_product.id, v_product.name, v_product.base_price,
    v_slot.id, v_slot.grading_date, v_slot.start_time, v_slot.end_time, v_slot.location;
END;
$function$;

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
  v_line_net numeric;
  v_line_tax numeric;
  v_discount numeric;
  v_discount_net numeric;
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
  v_tax_inclusive boolean := false;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;

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

  SELECT b.country INTO v_branch_country FROM public.branches b WHERE b.id = p_branch_id;
  v_tax_rate := CASE lower(COALESCE(v_branch_country, ''))
    WHEN 'singapore' THEN 0.09
    WHEN 'australia' THEN 0.10
    ELSE 0
  END;
  v_tax_inclusive := lower(COALESCE(v_branch_country, '')) = 'australia';

  v_invoice_number := public._next_invoice_number();
  INSERT INTO public.invoices (
    invoice_number, student_id, branch_id, status, subtotal, tax_amount, discount_amount,
    total_amount, amount_paid, balance_due, issue_date, due_date, notes, internal_notes,
    created_by, updated_by
  ) VALUES (
    v_invoice_number, p_student_id, p_branch_id, 'paid', 0, 0, 0, 0, 0, 0,
    CURRENT_DATE, CURRENT_DATE, format('Public hello chat payment: %s', p_category),
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

    SELECT p.id, p.name, COALESCE(p.metadata, '{}'::jsonb) AS metadata INTO v_product
    FROM public.products p WHERE p.id = NULLIF(v_item->>'product_id', '')::uuid LIMIT 1;
    IF v_product.id IS NULL THEN RAISE EXCEPTION 'Invalid product in cart'; END IF;

    v_line_total := round(v_customer_unit * v_qty, 2);
    v_discount := LEAST(v_discount, v_line_total);
    IF v_tax_inclusive AND v_tax_rate > 0 THEN
      v_line_net := round(v_line_total / (1 + v_tax_rate), 2);
      v_discount_net := round(v_discount / (1 + v_tax_rate), 2);
      v_line_tax := round((v_line_total - v_discount) - ((v_line_total - v_discount) / (1 + v_tax_rate)), 2);
    ELSE
      v_line_net := v_line_total;
      v_discount_net := v_discount;
      v_line_tax := round((v_line_total - v_discount) * v_tax_rate, 2);
    END IF;

    v_subtotal := v_subtotal + v_line_net;
    v_discount_total := v_discount_total + v_discount_net;
    v_tax_amount := v_tax_amount + v_line_tax;
    v_size_variant := NULLIF(COALESCE(v_item->>'size_variant', v_item->>'size', v_item->>'variant'), '');

    INSERT INTO public.invoice_items (
      invoice_id, product_id, size_variant, description, quantity, unit_price,
      tax_rate, tax_amount, total_amount, metadata, created_by, updated_by
    ) VALUES (
      v_invoice_id, v_product.id, v_size_variant,
      CASE WHEN v_term_name IS NOT NULL THEN v_product.name || ' — ' || v_term_name ELSE v_product.name END,
      v_qty, v_customer_unit, round(v_tax_rate * 100, 2), v_line_tax, v_line_total,
      jsonb_build_object(
        'source', 'public_hello_chat', 'customer_unit_price', v_customer_unit,
        'customer_line_total', v_line_total - v_discount,
        'grading_slot_id', v_grading_slot_id, 'term_id', v_term_id, 'term_name', v_term_name,
        'payment_plan', v_plan, 'weeks', v_qty, 'plan_discount', v_discount,
        'selected_options', COALESCE(v_item->'selected_options', '{}'::jsonb),
        'product_metadata', v_product.metadata, 'tax_inclusive', v_tax_inclusive
      ),
      'public_hello_chat', 'public_hello_chat'
    );
  END LOOP;

  v_net_total := GREATEST(round(v_subtotal - v_discount_total, 2), 0);
  IF NOT v_tax_inclusive THEN v_tax_amount := round(v_net_total * v_tax_rate, 2); END IF;
  v_grand_total := round(v_net_total + v_tax_amount, 2);

  IF abs(v_grand_total - round(p_amount, 2)) > 0.01 THEN
    RAISE EXCEPTION 'Payment total does not match invoice total';
  END IF;

  UPDATE public.invoices
  SET subtotal = v_subtotal, tax_amount = v_tax_amount, discount_amount = v_discount_total,
      total_amount = v_grand_total, amount_paid = v_grand_total, balance_due = 0,
      updated_at = now(), updated_by = 'public_hello_chat'
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
    VALUES (p_student_id, -v_credit_used, 'credit_hold', v_invoice_id::text,
      format('Credit on hold for Invoice #%s (pending verification)', v_invoice_number), 'public_hello_chat');

    v_payment_number := public.generate_payment_number();
    INSERT INTO public.payments (
      invoice_id, payment_number, payment_method, amount, payment_date, reference_number,
      proof_of_payment_url, notes, processed_by, is_verified, verification_status, created_by, updated_by
    ) VALUES (
      v_invoice_id, v_payment_number, 'credit', v_credit_used, CURRENT_DATE, v_invoice_number,
      NULL, format('Student credit applied (on hold until verification); session=%s', p_session_id),
      'public_hello_chat', false, 'pending', 'public_hello_chat', 'public_hello_chat'
    );
  END IF;

  IF v_remaining > 0 THEN
    v_payment_number := public.generate_payment_number();
    INSERT INTO public.payments (
      invoice_id, payment_number, payment_method, amount, payment_date, reference_number,
      proof_of_payment_url, notes, processed_by, is_verified, verification_status, created_by, updated_by
    ) VALUES (
      v_invoice_id, v_payment_number, p_payment_method, v_remaining, CURRENT_DATE, v_invoice_number,
      p_proof_url, format('Public hello chat payment pending verification; session=%s', p_session_id),
      'public_hello_chat', false, 'pending', 'public_hello_chat', 'public_hello_chat'
    );
  END IF;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_payment_number;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_public_payment_options(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_payment_options(text, text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.submit_public_chat_invoice(uuid, uuid, text, text, jsonb, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_chat_invoice(uuid, uuid, text, text, jsonb, numeric, text, text) TO anon, authenticated, service_role;