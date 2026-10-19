CREATE OR REPLACE FUNCTION public.create_external_invoice(p_password text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_scope text := _access_scope(p_password);
  v_name text := upper(trim(coalesce(p_payload->>'customer_name','')));
  v_cat text := coalesce(nullif(p_payload->>'customer_category',''),'retail');
  v_branch text := nullif(p_payload->>'branch_id','');
  v_country text; v_rate numeric; v_incl boolean;
  v_item jsonb; v_line numeric; v_tax_line numeric; v_sub numeric := 0; v_tax numeric := 0; v_total numeric;
  v_inv uuid; v_num text; v_prod record; v_qty int; v_price numeric;
  v_by text := CASE WHEN v_scope='*' THEN 'access (all branches)' ELSE 'access (' || v_scope || ')' END;
BEGIN
  IF v_name = '' THEN RAISE EXCEPTION 'Customer name is required'; END IF;
  IF v_cat NOT IN ('trial','school_club','retail') THEN RAISE EXCEPTION 'Invalid customer category'; END IF;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Branch is required'; END IF;
  IF v_scope <> '*' AND v_branch <> v_scope THEN RAISE EXCEPTION 'You can only invoice for your own branch'; END IF;
  IF p_payload->'items' IS NULL OR jsonb_array_length(p_payload->'items')=0 THEN RAISE EXCEPTION 'Add at least one item'; END IF;
  SELECT country INTO v_country FROM branches WHERE id=v_branch;
  IF NOT FOUND THEN RAISE EXCEPTION 'Branch not found'; END IF;
  v_rate := CASE v_country WHEN 'Singapore' THEN 0.09 WHEN 'Australia' THEN 0.10 ELSE 0 END;
  v_incl := CASE WHEN p_payload ? 'tax_inclusive' AND jsonb_typeof(p_payload->'tax_inclusive')='boolean'
                 THEN (p_payload->>'tax_inclusive')::boolean ELSE v_country = 'Australia' END;
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
  PERFORM _external_stock_move(v_inv, -1, v_by);
  RETURN jsonb_build_object('invoice_id', v_inv, 'invoice_number', v_num);
END $function$;