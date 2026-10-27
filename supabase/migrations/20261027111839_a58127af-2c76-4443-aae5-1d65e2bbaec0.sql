CREATE OR REPLACE FUNCTION public.access_record_payment(p_password text, p_invoice_id uuid, p_amount numeric, p_date date, p_method text, p_reference text, p_notes text, p_proof_url text, p_client_ref text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_scope text := _access_scope(p_password); v_inv invoices%ROWTYPE; v_cash boolean := p_method='cash'; v_id uuid;
  v_by text := CASE WHEN v_scope='*' THEN 'access (all branches)' ELSE 'access (' || v_scope || ')' END;
BEGIN
  IF nullif(p_client_ref,'') IS NOT NULL THEN
    SELECT id INTO v_id FROM payments WHERE client_ref = p_client_ref AND invoice_id = p_invoice_id;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_scope <> '*' AND NOT _scope_has(v_scope, v_inv.branch_id::text) THEN RAISE EXCEPTION 'Not your branch'; END IF;
  IF v_inv.status IN ('cancelled','refunded','void') THEN RAISE EXCEPTION 'Invoice is %', v_inv.status; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > coalesce(v_inv.balance_due,0) + 0.005 THEN RAISE EXCEPTION 'Amount must be between 0 and the balance due'; END IF;
  IF p_method NOT IN ('cash','card','bank_transfer','paynow','cheque') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF p_method IN ('paynow','bank_transfer') AND nullif(trim(p_proof_url),'') IS NULL THEN RAISE EXCEPTION 'Proof of payment image is required'; END IF;
  IF p_proof_url IS NOT NULL AND p_proof_url ~* '\.pdf$' THEN RAISE EXCEPTION 'Proof must be an image, not a PDF'; END IF;
  INSERT INTO payments(invoice_id, payment_number, payment_method, amount, payment_date, reference_number, notes, proof_of_payment_url, processed_by, created_by,
    is_verified, verification_status, verified_by, verified_at, client_ref)
  VALUES (p_invoice_id, 'PAY-ACC-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text,1,6), p_method, round(p_amount,2), coalesce(p_date, current_date),
    nullif(trim(p_reference),''), nullif(trim(p_notes),''), nullif(trim(p_proof_url),''), v_by, v_by,
    v_cash, CASE WHEN v_cash THEN 'verified' ELSE 'pending' END, CASE WHEN v_cash THEN v_by END, CASE WHEN v_cash THEN now() END, nullif(p_client_ref,''))
  RETURNING id INTO v_id;
  PERFORM recalc_invoice_from_payments(p_invoice_id);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.access_get_invoice_for_edit(p_password text, p_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_scope text := _access_scope(p_password); v_inv invoices%ROWTYPE; v_res jsonb;
BEGIN
  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_scope <> '*' AND NOT _scope_has(v_scope, v_inv.branch_id::text) THEN RAISE EXCEPTION 'Not your branch'; END IF;
  SELECT to_jsonb(v_inv) || jsonb_build_object(
    'student_name', coalesce((SELECT btrim(s.first_name||' '||coalesce(s.last_name,'')) FROM students s WHERE s.id=v_inv.student_id), v_inv.customer_name, 'Unknown Student'),
    'items', coalesce((SELECT jsonb_agg(to_jsonb(ii) || jsonb_build_object('product_name', coalesce(p.name,''), 'product_sku', coalesce(p.sku,''), 'metadata', coalesce(ii.metadata,'{}'::jsonb)) ORDER BY ii.created_at)
        FROM invoice_items ii LEFT JOIN products p ON p.id=ii.product_id WHERE ii.invoice_id=v_inv.id), '[]'::jsonb),
    'payments', coalesce((SELECT jsonb_agg(to_jsonb(pm) ORDER BY pm.payment_date) FROM payments pm WHERE pm.invoice_id=v_inv.id), '[]'::jsonb)
  ) INTO v_res;
  RETURN v_res;
END $$;

CREATE OR REPLACE FUNCTION public.access_submit_invoice_adjustment(p_password text, p_invoice_id uuid, p_request jsonb, p_actor text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_scope text := _access_scope(p_password); v_inv invoices%ROWTYPE; v_name text; v_id uuid; v_orig jsonb;
BEGIN
  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_scope <> '*' AND NOT _scope_has(v_scope, v_inv.branch_id::text) THEN RAISE EXCEPTION 'Not your branch'; END IF;
  IF jsonb_typeof(p_request->'editItems') <> 'array' OR p_request->'editTotals' IS NULL THEN RAISE EXCEPTION 'Adjustment details are incomplete'; END IF;
  IF EXISTS (SELECT 1 FROM invoice_action_requests WHERE invoice_id=p_invoice_id AND status='pending' AND action_type='adjustment') THEN
    RAISE EXCEPTION 'An edit request is already pending for this invoice';
  END IF;
  SELECT coalesce(btrim(first_name||' '||coalesce(last_name,'')), '') INTO v_name FROM students WHERE id=v_inv.student_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',ii.id,'product_id',ii.product_id,'description',ii.description,'quantity',ii.quantity,'unit_price',ii.unit_price,'total_amount',ii.total_amount,'size_variant',ii.size_variant) ORDER BY ii.created_at),'[]'::jsonb)
    INTO v_orig FROM invoice_items ii WHERE ii.invoice_id=p_invoice_id;
  INSERT INTO invoice_action_requests(invoice_id, action_type, request_data, requested_by, requested_by_email, invoice_number, student_name, status)
  VALUES (p_invoice_id, 'adjustment', p_request || jsonb_build_object('source','access_portal','originalItems',v_orig,'originalTotal',v_inv.total_amount),
    NULL, coalesce(nullif(p_actor,''), CASE WHEN v_scope='*' THEN 'access (all branches)' ELSE 'access ('||v_scope||')' END), v_inv.invoice_number, coalesce(v_name, v_inv.customer_name, ''), 'pending')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.access_record_payment(text,uuid,numeric,date,text,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.access_get_invoice_for_edit(text,uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.access_submit_invoice_adjustment(text,uuid,jsonb,text) TO anon, authenticated;