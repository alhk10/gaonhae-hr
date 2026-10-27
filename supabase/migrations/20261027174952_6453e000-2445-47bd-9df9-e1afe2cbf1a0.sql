CREATE OR REPLACE FUNCTION public.access_refund_rental_deposit(p_password text, p_invoice_id uuid, p_refund_date date DEFAULT CURRENT_DATE, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_scope text := _access_scope(p_password); v_inv invoices%ROWTYPE; v_dep invoice_items%ROWTYPE; v_amt numeric;
BEGIN
  IF v_scope IS DISTINCT FROM '*' THEN RAISE EXCEPTION 'Only the all-branch password can refund deposits'; END IF;
  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_inv.status NOT IN ('paid','verified') THEN RAISE EXCEPTION 'Invoice must be paid before refunding the deposit'; END IF;
  IF EXISTS (SELECT 1 FROM invoice_items WHERE invoice_id=p_invoice_id AND (metadata->>'deposit_refund')='true') THEN
    RAISE EXCEPTION 'Deposit already refunded'; END IF;
  SELECT * INTO v_dep FROM invoice_items WHERE invoice_id=p_invoice_id AND description ILIKE 'Refundable rental deposit%' AND total_amount > 0 LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No rental deposit on this invoice'; END IF;
  v_amt := v_dep.total_amount;
  INSERT INTO invoice_items(invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, metadata, created_by)
  VALUES (p_invoice_id, v_dep.product_id, 'Rental deposit refunded', 1, -v_amt, 0, 0, -v_amt,
    coalesce(v_dep.metadata,'{}'::jsonb) || jsonb_build_object('deposit_refund', true, 'refund_date', p_refund_date, 'note', p_note), 'access (all branches)');
  UPDATE invoices SET total_amount = round(total_amount - v_amt, 2), subtotal = round(coalesce(subtotal,0) - v_amt, 2),
    internal_notes = concat_ws(E'\n', internal_notes, 'Deposit ' || v_amt || ' refunded ' || p_refund_date || coalesce(': ' || nullif(trim(p_note),''),''))
  WHERE id=p_invoice_id;
  INSERT INTO payments(invoice_id, payment_number, payment_method, amount, payment_date, notes, processed_by, created_by, is_verified, verified_by, verified_at, verification_status)
  VALUES (p_invoice_id, 'DEPREF-' || v_inv.invoice_number, 'cash', -v_amt, p_refund_date, 'Rental deposit refunded' || coalesce(': ' || nullif(trim(p_note),''),''),
    'access (all branches)', 'access (all branches)', true, 'access (all branches)', now(), 'verified');
  PERFORM recalc_invoice_from_payments(p_invoice_id);
  INSERT INTO invoice_change_logs(invoice_id, action, changed_by, changes)
  VALUES (p_invoice_id, 'deposit_refunded', 'access (all branches)', jsonb_build_object('amount', v_amt, 'date', p_refund_date, 'note', p_note));
  RETURN jsonb_build_object('amount', v_amt);
END $$;
GRANT EXECUTE ON FUNCTION public.access_refund_rental_deposit(text, uuid, date, text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.list_external_invoices(text, text);
CREATE FUNCTION public.list_external_invoices(p_password text, p_branch_id text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, invoice_number text, customer_name text, customer_category text, customer_email text, customer_phone text, customer_reference text, branch_id text, branch_name text, status text, total_amount numeric, amount_paid numeric, balance_due numeric, issue_date date, items text, proof_url text, pending_payment boolean, cancel_requested boolean, has_deposit boolean, deposit_refunded_on text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_scope text := _access_scope(p_password);
BEGIN
  RETURN QUERY
  SELECT i.id, i.invoice_number, i.customer_name, i.customer_category, i.customer_email, i.customer_phone, i.customer_reference,
    i.branch_id, b.name, i.status, i.total_amount, i.amount_paid, i.balance_due, i.issue_date,
    (SELECT string_agg(ii.quantity || 'x ' || ii.description, ', ') FROM invoice_items ii WHERE ii.invoice_id=i.id),
    (SELECT p.proof_of_payment_url FROM payments p WHERE p.invoice_id=i.id AND p.proof_of_payment_url IS NOT NULL ORDER BY p.created_at DESC LIMIT 1),
    EXISTS (SELECT 1 FROM payments p WHERE p.invoice_id=i.id AND p.verification_status='pending'),
    EXISTS (SELECT 1 FROM invoice_action_requests r WHERE r.invoice_id=i.id AND r.status='pending' AND r.action_type='cancellation'),
    EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id=i.id AND ii.description ILIKE 'Refundable rental deposit%' AND ii.total_amount > 0),
    (SELECT ii.metadata->>'refund_date' FROM invoice_items ii WHERE ii.invoice_id=i.id AND (ii.metadata->>'deposit_refund')='true' LIMIT 1)
  FROM invoices i LEFT JOIN branches b ON b.id=i.branch_id
  WHERE i.customer_type='external'
    AND (v_scope='*' OR _scope_has(v_scope, i.branch_id))
    AND (p_branch_id IS NULL OR i.branch_id=p_branch_id)
  ORDER BY i.created_at DESC LIMIT 500;
END $function$;
GRANT EXECUTE ON FUNCTION public.list_external_invoices(text, text) TO anon, authenticated;