-- 1. Public class products for a branch
CREATE OR REPLACE FUNCTION public.get_public_class_products(p_branch_id text)
RETURNS TABLE(product_id uuid, product_name text, description text, base_price numeric, branch_price numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.name,
    p.description,
    p.base_price,
    COALESCE(pr.price_override, p.base_price) AS branch_price
  FROM public.products p
  LEFT JOIN public.price_rules pr
    ON pr.product_id = p.id AND pr.branch_id = p_branch_id AND pr.is_active = true
  WHERE p.is_active = true
    AND p.category_id = 'a416f120-4ec2-4826-8d37-375db3e002bc'::uuid
    AND p.name NOT IN ('Trial Lesson', 'Ad-Hoc Lesson', 'Private Lesson')
  ORDER BY p.name;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_class_products(text) TO anon, authenticated;

-- 2. Terms for a branch
CREATE OR REPLACE FUNCTION public.get_public_terms_for_branch(p_branch_id text)
RETURNS TABLE(term_id uuid, term_name text, start_date date, end_date date)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT t.id, t.name, t.start_date, t.end_date
  FROM public.term_calendars t
  WHERE t.branch_id = p_branch_id
    AND COALESCE(t.is_active, true) = true
    AND t.end_date >= (CURRENT_DATE - INTERVAL '120 days')
  ORDER BY t.start_date ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_terms_for_branch(text) TO anon, authenticated;

-- 3. Public school fees submission (no chat session required)
CREATE OR REPLACE FUNCTION public.submit_public_school_fees(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_date_of_birth date,
  p_branch_id text,
  p_product_id uuid,
  p_term_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_proof_url text
)
RETURNS TABLE(id uuid, reference_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref text;
  v_id uuid;
  v_product record;
  v_term record;
  v_branch_country text;
  v_unit numeric;
  v_items jsonb;
BEGIN
  IF COALESCE(TRIM(p_first_name), '') = '' OR COALESCE(TRIM(p_last_name), '') = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF COALESCE(TRIM(p_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid email is required';
  END IF;
  IF p_payment_method NOT IN ('paynow', 'bank_transfer') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;
  IF p_proof_url IS NULL OR TRIM(p_proof_url) = '' THEN
    RAISE EXCEPTION 'Proof of payment is required';
  END IF;

  SELECT b.country INTO v_branch_country FROM public.branches b WHERE b.id = p_branch_id;
  IF v_branch_country IS NULL THEN
    RAISE EXCEPTION 'Invalid branch';
  END IF;

  SELECT p.id, p.name INTO v_product
  FROM public.products p
  WHERE p.id = p_product_id
    AND p.is_active = true
    AND p.category_id = 'a416f120-4ec2-4826-8d37-375db3e002bc'::uuid;
  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'Invalid class package';
  END IF;

  SELECT COALESCE(pr.price_override, p.base_price) INTO v_unit
  FROM public.products p
  LEFT JOIN public.price_rules pr
    ON pr.product_id = p.id AND pr.branch_id = p_branch_id AND pr.is_active = true
  WHERE p.id = p_product_id;

  IF p_term_id IS NOT NULL THEN
    SELECT t.id, t.name INTO v_term FROM public.term_calendars t WHERE t.id = p_term_id;
  END IF;

  v_ref := 'FEE-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 6));

  v_items := jsonb_build_array(jsonb_build_object(
    'product_id', v_product.id,
    'product_name', v_product.name,
    'qty', 1,
    'unit_price', COALESCE(v_unit, 0),
    'term_id', v_term.id,
    'term_name', v_term.name,
    'contact_first_name', UPPER(TRIM(p_first_name)),
    'contact_last_name', UPPER(TRIM(p_last_name)),
    'contact_email', LOWER(TRIM(p_email)),
    'contact_dob', p_date_of_birth,
    'source', 'public_fees'
  ));

  INSERT INTO public.public_chat_payment_submissions (
    session_id, reference_number, branch_id, category, items, amount,
    payment_method, proof_url, matched_student_id, status, notes
  ) VALUES (
    NULL,
    v_ref,
    p_branch_id,
    'a416f120-4ec2-4826-8d37-375db3e002bc',
    v_items,
    p_amount,
    p_payment_method,
    p_proof_url,
    NULL,
    'pending_verification',
    format('Public /fees submission by %s %s (%s)', UPPER(TRIM(p_first_name)), UPPER(TRIM(p_last_name)), LOWER(TRIM(p_email)))
  ) RETURNING public_chat_payment_submissions.id INTO v_id;

  RETURN QUERY SELECT v_id, v_ref;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_public_school_fees(text, text, text, date, text, uuid, uuid, numeric, text, text) TO anon, authenticated;

-- 4. School fees list with contact fallback
DROP FUNCTION IF EXISTS public.get_public_school_fees_list(text, text);

CREATE OR REPLACE FUNCTION public.get_public_school_fees_list(p_branch_id text DEFAULT NULL::text, p_status text DEFAULT NULL::text)
RETURNS TABLE(
  id uuid, created_at timestamp with time zone, student_id uuid, student_name text,
  contact_name text, contact_email text, contact_dob text, reference_number text,
  branch_id text, branch_name text, category text, items jsonb, amount numeric,
  payment_method text, proof_url text, status text, invoice_id uuid, invoice_number text,
  invoice_status text, payment_id uuid, payment_number text, payment_verification_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    s.id,
    s.created_at,
    s.matched_student_id AS student_id,
    COALESCE(
      NULLIF(UPPER(TRIM(COALESCE(st.first_name, '') || ' ' || COALESCE(st.last_name, ''))), ''),
      NULLIF(UPPER(TRIM(COALESCE(s.items->0->>'contact_first_name', '') || ' ' || COALESCE(s.items->0->>'contact_last_name', ''))), '')
    ) AS student_name,
    NULLIF(UPPER(TRIM(COALESCE(s.items->0->>'contact_first_name', '') || ' ' || COALESCE(s.items->0->>'contact_last_name', ''))), '') AS contact_name,
    s.items->0->>'contact_email' AS contact_email,
    s.items->0->>'contact_dob' AS contact_dob,
    s.reference_number,
    s.branch_id,
    b.name AS branch_name,
    s.category,
    s.items,
    s.amount,
    s.payment_method,
    s.proof_url,
    s.status,
    inv.id AS invoice_id,
    inv.invoice_number,
    inv.status AS invoice_status,
    pay.id AS payment_id,
    pay.payment_number,
    pay.verification_status AS payment_verification_status
  FROM public.public_chat_payment_submissions s
  LEFT JOIN public.students st ON st.id = s.matched_student_id
  LEFT JOIN public.branches b ON b.id = s.branch_id
  LEFT JOIN LATERAL (
    SELECT i.* FROM public.invoices i
    WHERE i.id = public._resolve_chat_submission_invoice(s)
  ) inv ON true
  LEFT JOIN LATERAL (
    SELECT p.* FROM public.payments p
    WHERE p.invoice_id = inv.id
    ORDER BY p.created_at DESC
    LIMIT 1
  ) pay ON true
  WHERE s.category = 'a416f120-4ec2-4826-8d37-375db3e002bc'
    AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
    AND (p_status IS NULL OR s.status = p_status)
  ORDER BY s.created_at DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_school_fees_list(text, text) TO anon, authenticated;

-- 5. Match a school fees submission to a student, creating invoice + payment
CREATE OR REPLACE FUNCTION public.admin_match_school_fees_submission(
  p_id uuid,
  p_student_id uuid,
  p_matched_by text DEFAULT 'admin'::text
)
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
      0, 0,
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
        THEN 'Singapore branch adjustment (incl. 9% GST)'
        ELSE 'Public fees price adjustment' END,
      1, v_adjustment, 0, 0, v_adjustment,
      jsonb_build_object('source', 'public_fees', 'reason', 'customer_display_price_adjustment'),
      'public_fees', 'public_fees'
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
      updated_by = p_matched_by
  WHERE id = v_invoice_id;

  v_payment_number := public.generate_payment_number();

  INSERT INTO public.payments (
    invoice_id, payment_number, payment_method, amount, payment_date,
    reference_number, proof_of_payment_url, notes, processed_by,
    is_verified, verification_status, created_by, updated_by
  ) VALUES (
    v_invoice_id, v_payment_number, COALESCE(sub.payment_method, 'bank_transfer'),
    v_paid_total, CURRENT_DATE, COALESCE(sub.reference_number, v_invoice_number),
    sub.proof_url,
    'Public /fees payment pending verification',
    'public_fees', false, 'pending_verification', 'public_fees', 'public_fees'
  );

  UPDATE public.public_chat_payment_submissions
  SET matched_student_id = p_student_id,
      matched_invoice_id = v_invoice_id,
      notes = COALESCE(notes, '') || format(E'\nMatched by %s at %s', p_matched_by, now())
  WHERE id = p_id;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number, v_payment_number;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_match_school_fees_submission(uuid, uuid, text) TO anon, authenticated;
