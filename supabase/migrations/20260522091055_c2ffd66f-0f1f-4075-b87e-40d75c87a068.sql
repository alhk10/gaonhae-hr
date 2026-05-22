-- Public /hello payment flow upgrades

CREATE OR REPLACE FUNCTION public.get_public_chat_products_for_student(
  p_session_id uuid,
  p_student_id uuid,
  p_branch_id text,
  p_category_id uuid
)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  base_price numeric,
  branch_price numeric,
  requires_size boolean,
  available_sizes text[],
  available_variants jsonb,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_belt text;
  v_school_fee_category uuid := 'a416f120-4ec2-4826-8d37-375db3e002bc'::uuid;
  v_uniform_category uuid := 'cb4591b5-71fc-49cd-85ba-fce2f7d5a90c'::uuid;
  v_protection_category uuid := '117cdc13-1296-4651-bc4b-f0449873cbf1'::uuid;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RETURN;
  END IF;

  SELECT s.current_belt INTO v_current_belt
  FROM public.students s
  WHERE s.id = p_student_id;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.base_price,
    COALESCE(pr.price_override, p.base_price) AS branch_price,
    COALESCE(p.requires_size, false),
    p.available_sizes,
    COALESCE(p.available_variants, '{}'::jsonb),
    COALESCE(p.metadata, '{}'::jsonb)
  FROM public.products p
  LEFT JOIN public.price_rules pr
    ON pr.product_id = p.id
   AND pr.branch_id = p_branch_id
   AND COALESCE(pr.is_active, true) = true
  WHERE COALESCE(p.is_active, true) = true
    AND p.category_id = p_category_id
    AND (
      (p_category_id = v_school_fee_category AND EXISTS (
        SELECT 1
        FROM public.invoice_items ii
        JOIN public.invoices i ON i.id = ii.invoice_id
        WHERE ii.product_id = p.id
          AND i.student_id = p_student_id
          AND i.branch_id = p_branch_id
      ))
      OR (p_category_id = v_uniform_category
        AND v_current_belt IS NOT NULL
        AND p.allowed_belt_levels IS NOT NULL
        AND p.allowed_belt_levels @> ARRAY[v_current_belt]::text[]
      )
      OR (p_category_id = v_protection_category)
      OR (p_category_id NOT IN (v_school_fee_category, v_uniform_category, v_protection_category))
    )
  ORDER BY p.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_chat_products_for_student(uuid, uuid, text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_chat_invoice(
  p_session_id uuid,
  p_student_id uuid,
  p_branch_id text,
  p_category text,
  p_items jsonb,
  p_amount numeric,
  p_payment_method text,
  p_proof_url text
)
RETURNS TABLE(invoice_id uuid, invoice_number text, payment_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_base_total numeric := 0;
  v_paid_total numeric := 0;
  v_adjustment numeric := 0;
  v_adjustment_product_id uuid;
  v_size_variant text;
  v_grading_slot_id uuid;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RAISE EXCEPTION 'Invalid chat session';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No payment items provided';
  END IF;

  IF p_payment_method NOT IN ('paynow', 'bank_transfer') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT b.country INTO v_branch_country
  FROM public.branches b
  WHERE b.id = p_branch_id;

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
    v_customer_total := round(v_customer_unit * v_qty, 2);
    v_paid_total := v_paid_total + v_customer_total;
    v_grading_slot_id := NULLIF(v_item->>'grading_slot_id', '')::uuid;

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
      v_product.name,
      v_qty,
      v_unit,
      0,
      0,
      v_line_total,
      jsonb_build_object(
        'source', 'public_hello_chat',
        'customer_unit_price', v_customer_unit,
        'customer_line_total', v_customer_total,
        'grading_slot_id', v_grading_slot_id,
        'selected_options', COALESCE(v_item->'selected_options', '{}'::jsonb),
        'product_metadata', v_product.metadata
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
      CASE WHEN lower(COALESCE(v_branch_country, '')) = 'singapore'
        THEN 'Singapore branch adjustment (incl. 9% GST)'
        ELSE 'Public hello chat price adjustment'
      END,
      1,
      v_adjustment,
      0,
      0,
      v_adjustment,
      jsonb_build_object('source', 'public_hello_chat', 'reason', 'customer_display_price_adjustment'),
      'public_hello_chat',
      'public_hello_chat'
    );
  END IF;

  UPDATE public.invoices
  SET subtotal = v_base_total,
      tax_amount = 0,
      discount_amount = CASE WHEN v_adjustment < 0 THEN abs(v_adjustment) ELSE 0 END,
      total_amount = v_paid_total,
      amount_paid = v_paid_total,
      balance_due = 0,
      updated_at = now(),
      updated_by = 'public_hello_chat'
  WHERE id = v_invoice_id;

  v_payment_number := public.generate_payment_number();

  INSERT INTO public.payments (
    invoice_id, payment_number, payment_method, amount, payment_date,
    reference_number, proof_of_payment_url, notes, processed_by,
    is_verified, verification_status, created_by, updated_by
  ) VALUES (
    v_invoice_id,
    v_payment_number,
    p_payment_method,
    v_paid_total,
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

  INSERT INTO public.public_chat_payment_submissions (
    session_id, branch_id, category, items, amount, payment_method,
    proof_url, matched_student_id, status
  ) VALUES (
    p_session_id,
    p_branch_id,
    p_category,
    p_items,
    v_paid_total,
    p_payment_method,
    p_proof_url,
    p_student_id,
    'pending_verification'
  );

  UPDATE public.public_chat_sessions
  SET outcome = 'payment', updated_at = now()
  WHERE id = p_session_id;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_payment_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_chat_invoice(uuid, uuid, text, text, jsonb, numeric, text, text) TO anon, authenticated;

-- Replace public protection guard/accessory catalogue items with curated sets.
UPDATE public.products
SET is_active = false,
    updated_at = now(),
    updated_by = 'public_hello_chat'
WHERE category_id = '117cdc13-1296-4651-bc4b-f0449873cbf1'::uuid;

INSERT INTO public.products (
  sku, name, description, category_id, base_price, tax_rate, is_active,
  requires_size, requires_color, available_sizes, available_variants,
  metadata, created_by, updated_by
) VALUES
  (
    'GAO-PROTECTOR-SET',
    'Gaonhae Arm, Shin & Groin Protector Set',
    'Gaonhae arm, shin and groin protector set.',
    '117cdc13-1296-4651-bc4b-f0449873cbf1'::uuid,
    100,
    0,
    true,
    true,
    false,
    ARRAY['XS','S','M','L','XL']::text[],
    jsonb_build_object('sizes', ARRAY['XS','S','M','L','XL'], 'genders', ARRAY['Male','Female']),
    jsonb_build_object('sg_target_price', 140, 'is_preorder', false),
    'public_hello_chat',
    'public_hello_chat'
  ),
  (
    'ADI-PROTECTOR-SET-PREORDER',
    'Adidas Arm, Shin & Groin Protector Set - Preorder',
    'Adidas arm, shin and groin protector preorder set.',
    '117cdc13-1296-4651-bc4b-f0449873cbf1'::uuid,
    165,
    0,
    true,
    true,
    false,
    ARRAY['XS','S','M','L','XL']::text[],
    jsonb_build_object('sizes', ARRAY['XS','S','M','L','XL'], 'genders', ARRAY['Male','Female']),
    jsonb_build_object('sg_target_price', 185, 'is_preorder', true),
    'public_hello_chat',
    'public_hello_chat'
  ),
  (
    'ADI-CHEST-HEAD-SET-PREORDER',
    'Adidas Chestguard & Headgear Set - Preorder',
    'Adidas chestguard and headgear preorder set.',
    '117cdc13-1296-4651-bc4b-f0449873cbf1'::uuid,
    260,
    0,
    true,
    true,
    true,
    ARRAY['1','2','3','4','5']::text[],
    jsonb_build_object('sizes', ARRAY['1','2','3','4','5'], 'colors', ARRAY['Red','Blue']),
    jsonb_build_object('sg_target_price', 284.30, 'is_preorder', true),
    'public_hello_chat',
    'public_hello_chat'
  ),
  (
    'FACE-SHIELD',
    'Face Shield',
    'Face shield.',
    '117cdc13-1296-4651-bc4b-f0449873cbf1'::uuid,
    20,
    0,
    true,
    false,
    false,
    NULL,
    '{}'::jsonb,
    jsonb_build_object('sg_target_price', 25, 'is_preorder', false),
    'public_hello_chat',
    'public_hello_chat'
  )
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category_id = EXCLUDED.category_id,
  base_price = EXCLUDED.base_price,
  tax_rate = EXCLUDED.tax_rate,
  is_active = true,
  requires_size = EXCLUDED.requires_size,
  requires_color = EXCLUDED.requires_color,
  available_sizes = EXCLUDED.available_sizes,
  available_variants = EXCLUDED.available_variants,
  metadata = EXCLUDED.metadata,
  updated_at = now(),
  updated_by = 'public_hello_chat';