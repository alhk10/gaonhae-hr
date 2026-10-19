ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_category text;

CREATE OR REPLACE FUNCTION public.list_external_invoices(p_branch_id text DEFAULT NULL)
RETURNS TABLE(id uuid, invoice_number text, customer_name text, customer_category text, customer_email text, customer_phone text, customer_reference text, branch_id text, branch_name text, status text, total_amount numeric, amount_paid numeric, balance_due numeric, issue_date date, items text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT i.id, i.invoice_number, i.customer_name, i.customer_category, i.customer_email, i.customer_phone, i.customer_reference,
    i.branch_id, b.name, i.status, i.total_amount, i.amount_paid, i.balance_due, i.issue_date,
    (SELECT string_agg(ii.quantity || 'x ' || ii.description, ', ') FROM invoice_items ii WHERE ii.invoice_id=i.id)
  FROM invoices i LEFT JOIN branches b ON b.id=i.branch_id
  WHERE i.customer_type='external' AND (p_branch_id IS NULL OR i.branch_id=p_branch_id)
  ORDER BY i.created_at DESC LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.list_external_invoice_products()
RETURNS TABLE(id uuid, name text, base_price numeric, available_sizes text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id, name, base_price, available_sizes FROM products
  WHERE is_active AND coalesce(is_lesson,false)=false ORDER BY name;
$$;

CREATE OR REPLACE FUNCTION public.create_external_invoice(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_name text := upper(trim(coalesce(p_payload->>'customer_name','')));
  v_cat text := coalesce(nullif(p_payload->>'customer_category',''),'retail');
  v_branch text := nullif(p_payload->>'branch_id','');
  v_country text; v_rate numeric; v_incl boolean;
  v_item jsonb; v_line numeric; v_tax_line numeric; v_sub numeric := 0; v_tax numeric := 0; v_total numeric;
  v_inv uuid; v_num text; v_prod record; v_qty int; v_price numeric;
  v_by text := left(coalesce(nullif(p_payload->>'actor',''),'access'),100);
BEGIN
  IF v_name = '' THEN RAISE EXCEPTION 'Customer name is required'; END IF;
  IF v_cat NOT IN ('trial','school_club','retail') THEN RAISE EXCEPTION 'Invalid customer category'; END IF;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Branch is required'; END IF;
  IF p_payload->'items' IS NULL OR jsonb_array_length(p_payload->'items')=0 THEN RAISE EXCEPTION 'Add at least one item'; END IF;
  SELECT country INTO v_country FROM branches WHERE id=v_branch;
  IF NOT FOUND THEN RAISE EXCEPTION 'Branch not found'; END IF;
  v_rate := CASE v_country WHEN 'Singapore' THEN 0.09 WHEN 'Australia' THEN 0.10 ELSE 0 END;
  v_incl := v_country = 'Australia';
  v_num := _next_invoice_number();
  INSERT INTO invoices(invoice_number, student_id, customer_type, customer_category, customer_name, customer_email, customer_phone, customer_reference,
    branch_id, status, issue_date, due_date, payment_terms_days, notes, created_by)
  VALUES (v_num, NULL, 'external', v_cat, v_name, nullif(lower(trim(p_payload->>'customer_email')),''), nullif(trim(p_payload->>'customer_phone'),''),
    nullif(trim(p_payload->>'customer_reference'),''), v_branch, 'unpaid', current_date, current_date + 14, 14, nullif(p_payload->>'notes',''), v_by)
  RETURNING id INTO v_inv;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items') LOOP
    SELECT id, name INTO v_prod FROM products WHERE id = (v_item->>'product_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
    v_qty := greatest(coalesce((v_item->>'quantity')::int,1),1);
    v_price := greatest(coalesce((v_item->>'unit_price')::numeric,0),0);
    v_line := v_qty * v_price;
    IF v_incl THEN v_tax_line := v_line - v_line/(1+v_rate); v_sub := v_sub + v_line - v_tax_line;
    ELSE v_tax_line := v_line*v_rate; v_sub := v_sub + v_line; END IF;
    v_tax := v_tax + v_tax_line;
    INSERT INTO invoice_items(invoice_id, product_id, size_variant, description, quantity, unit_price, tax_rate, tax_amount, total_amount, created_by)
    VALUES (v_inv, v_prod.id, nullif(v_item->>'size_variant',''), v_prod.name || coalesce(' ('||nullif(v_item->>'size_variant','')||')',''),
      v_qty, v_price, v_rate, round(v_tax_line,2), round(CASE WHEN v_incl THEN v_line ELSE v_line + v_tax_line END,2), v_by);
  END LOOP;
  v_total := round(v_sub + v_tax, 2);
  UPDATE invoices SET subtotal=round(v_sub,2), tax_amount=round(v_tax,2), total_amount=v_total, balance_due=v_total WHERE id=v_inv;
  RETURN jsonb_build_object('invoice_id', v_inv, 'invoice_number', v_num);
END $$;

CREATE OR REPLACE FUNCTION public.record_external_invoice_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_reference text, p_actor text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_inv invoices%ROWTYPE; v_paid numeric;
BEGIN
  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id AND customer_type='external' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'External invoice not found'; END IF;
  IF v_inv.status='cancelled' THEN RAISE EXCEPTION 'Invoice is cancelled'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > v_inv.balance_due + 0.005 THEN RAISE EXCEPTION 'Amount must be between 0 and the balance due'; END IF;
  IF p_method NOT IN ('cash','card','bank_transfer','paynow','cheque') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  INSERT INTO payments(invoice_id, payment_number, payment_method, amount, payment_date, reference_number, processed_by, created_by, is_verified, verification_status, verified_by, verified_at)
  VALUES (p_invoice_id, 'PAY-EXT-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text,1,6), p_method, round(p_amount,2), current_date,
    nullif(trim(p_reference),''), left(coalesce(p_actor,'access'),100), left(coalesce(p_actor,'access'),100), true, 'verified', left(coalesce(p_actor,'access'),100), now());
  v_paid := v_inv.amount_paid + round(p_amount,2);
  UPDATE invoices SET amount_paid=v_paid, balance_due=greatest(total_amount - v_paid,0),
    status = CASE WHEN total_amount - v_paid <= 0.005 THEN 'paid' ELSE 'partially_paid' END, updated_at=now()
  WHERE id=p_invoice_id;
END $$;

GRANT EXECUTE ON FUNCTION public.list_external_invoices(text), public.list_external_invoice_products(), public.create_external_invoice(jsonb), public.record_external_invoice_payment(uuid,numeric,text,text,text) TO anon, authenticated;