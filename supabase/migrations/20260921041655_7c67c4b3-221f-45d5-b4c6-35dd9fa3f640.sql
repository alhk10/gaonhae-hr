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
  v_unit numeric;
  v_customer_unit numeric;
  v_line_total numeric;
  v_customer_total numeric;
  v_discount numeric;
  v_plan text;
  v_base_total numeric := 0;
  v_paid_total numeric := 0;
  v_adjustment numeric := 0;
  v_adjustment_product_id uuid;
  v_size_variant text;
  v_grading_slot_id uuid;
  v_term_id uuid;
  v_term_name text;
  v_available_credit numeric := 0;
  v_credit_used numeric := 0;
  v_remaining numeric := 0;
  v_tax_rate numeric := 0;
  v_subtotal numeric := 0;
  v_tax_amount numeric := 0;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RAISE EXCEPTION 'Invalid chat session';
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

  SELECT p.id INTO v_adjustment_product_id
  FROM public.products p
  WHERE p.sku = 'PUBLIC-HELLO-SG-ADJUSTMENT'
  LIMIT 1;

  IF v_adjustment_product_id IS NULL THEN
    INSERT INTO public.products (
      sku, name, description, category_id, base_price, tax_rate,
      is_active, requires_size, metadata, created_by, updated_by
    ) VALUES (
      'PUBLIC-HELLO-SG-ADJUSTMENT',
      'Singapore branch adjustment (incl. 9% GST)',
      'System adjustment for public hello chat invoices.',
      '1e25af63-2eb3-43fe-9359-7acccebf5234'::uuid,
      0,
      0,
      false,
      false,
      jsonb_build_object('system', true, 'source', 'public_hello_chat'),
      'public_hello_chat',
      'public_hello_chat'
    ) RETURNING id INTO v_adjustment_product_id;
  END IF;

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
    v_customer_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_discount := GREATEST(COALESCE((v_item->>'discount')::numeric, 0), 0);
    v_plan := NULLIF(v_item->>'payment_plan', '');
    v_customer_total := GREATEST(round(v_customer_unit * v_qty, 2) - v_discount, 0);
    v_paid_total := v_paid_total + v_customer_total;
    v_grading_slot_id := NULLIF(v_item->>'grading_slot_id', '')::uuid;
    v_term_id := NULLIF(v_item->>'term_id', '')::uuid;
    v_term_name := NULLIF(v_item->>'term_name', '');

    SELECT
      p.id,
      p.name,
      COALESCE(pr.price_override, p.base_price) AS branch_price,
      COALESCE(p.metadata, '{}'::jsonb) AS metadata
    INTO v_product
    FROM public.products p
    LEFT JOIN public.price_rules pr
      ON pr.product_id = p.id
     AND pr.branch_id = p_branch_id
     AND COALESCE(pr.is_active, true) = true
    WHERE p.id = NULLIF(v_item->>'product_id', '')::uuid
    LIMIT 1;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Invalid product in cart';
    END IF;

    v_unit := COALESCE(v_product.branch_price, v_customer_unit);
    v_line_total := round(v_unit * v_qty, 2);
    v_base_total := v_base_total + v_line_total;
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
      v_unit,
      round(v_tax_rate * 100, 2),
      round(v_line_total - (v_line_total / (1 + v_tax_rate)), 2),
      v_line_total,
      jsonb_build_object(
        'source', 'public_hello_chat',
        'customer_unit_price', v_customer_unit,
        'customer_line_total', v_customer_total,
        'grading_slot_id', v_grading_slot_id,
        'term_id', v_term_id,
        'term_name', v_term_name,
        'payment_plan', v_plan,
        'weeks', v_qty,
        'plan_discount', v_discount,
        'selected_options', COALESCE(v_item->'selected_options', '{}'::jsonb),
        'product_metadata', v_product.metadata,
        'tax_inclusive', true
      ),
      'public_hello_chat',
      'public_hello_chat'
    );
  END LOOP;

  v_adjustment := round(v_paid_total - v_base_total, 2);

  IF abs(v_adjustment) >= 0.01 THEN
    INSERT INTO public.invoice_items (
      invoice_id, product_id, size_variant, description, quantity, unit_price,
      tax_rate, tax_amount, total_amount, metadata, created_by, updated_by
    ) VALUES (
      v_invoice_id,
      v_adjustment_product_id,
      NULL,
      CASE WHEN v_tax_rate > 0
        THEN format('Price adjustment (incl. %s%% GST)', round(v_tax_rate * 100, 0))
        ELSE 'Public hello chat price adjustment'
      END,
      1,
      v_adjustment,
      round(v_tax_rate * 100, 2),
      round(v_adjustment - (v_adjustment / (1 + v_tax_rate)), 2),
      v_adjustment,
      jsonb_build_object('source', 'public_hello_chat', 'reason', 'customer_display_price_adjustment', 'tax_inclusive', true),
      'public_hello_chat',
      'public_hello_chat'
    );
  END IF;

  -- GST is inside the amount the parent paid: total stays the same, tax is split out.
  v_subtotal := round(v_paid_total / (1 + v_tax_rate), 2);
  v_tax_amount := round(v_paid_total - v_subtotal, 2);

  UPDATE public.invoices
  SET subtotal = v_subtotal,
      tax_amount = v_tax_amount,
      discount_amount = 0,
      total_amount = v_paid_total,
      amount_paid = v_paid_total,
      balance_due = 0,
      updated_at = now(),
      updated_by = 'public_hello_chat'
  WHERE id = v_invoice_id;

  -- Lock this student's credit ledger so two concurrent payments cannot spend the same credit.
  PERFORM pg_advisory_xact_lock(hashtextextended('student_credit:' || p_student_id::text, 0));

  v_available_credit := GREATEST(COALESCE(public.get_student_available_credit(p_student_id), 0), 0);
  v_credit_used := round(LEAST(v_available_credit, v_paid_total), 2);
  v_remaining := round(v_paid_total - v_credit_used, 2);

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
      'pending_verification',
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
      'pending_verification',
      'public_hello_chat',
      'public_hello_chat'
    );
  END IF;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_payment_number;
END;
$function$;