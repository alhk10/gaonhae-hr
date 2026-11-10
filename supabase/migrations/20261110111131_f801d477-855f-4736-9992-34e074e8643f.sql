CREATE OR REPLACE FUNCTION public.apply_scanned_payment_amount(p_password text, p_payment_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_pay payments%ROWTYPE; v_inv invoices%ROWTYPE; v_scope text; v_super boolean := false; v_actor text; v_name text;
BEGIN
  SELECT * INTO v_pay FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_pay.proof_scan_amount IS NULL OR v_pay.proof_scan_amount <= 0 THEN RAISE EXCEPTION 'No scanned amount to apply'; END IF;
  IF round(v_pay.proof_scan_amount,2) = round(v_pay.amount,2) THEN RETURN 'unchanged'; END IF;
  SELECT * INTO v_inv FROM invoices WHERE id = v_pay.invoice_id;

  v_actor := auth.jwt()->>'email';
  IF v_actor IS NOT NULL AND public.is_superadmin(v_actor) THEN v_super := true; END IF;
  IF NOT v_super AND coalesce(p_password,'') <> '' THEN
    v_scope := _access_scope(p_password);
    IF v_scope = '*' THEN v_super := true; v_actor := 'access (all branches)';
    ELSIF NOT _scope_has(v_scope, v_inv.branch_id::text) THEN RAISE EXCEPTION 'Not your branch';
    ELSE v_actor := 'access ('||v_scope||')'; END IF;
  END IF;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;

  IF v_super THEN
    INSERT INTO payment_amount_corrections(source, submission_id, invoice_id, old_total, new_total, evidence, created_by)
    VALUES ('payment_rescan', v_pay.id, v_pay.invoice_id, v_pay.amount, v_pay.proof_scan_amount, 'Rescanned proof of '||coalesce(v_pay.payment_number,''), v_actor);
    UPDATE payments SET amount = v_pay.proof_scan_amount, proof_scan_status = 'match', updated_at = now() WHERE id = v_pay.id;
    RETURN 'applied';
  END IF;

  IF EXISTS (SELECT 1 FROM invoice_action_requests WHERE action_type='payment_amount' AND status='pending' AND request_data->>'payment_id' = v_pay.id::text) THEN
    RAISE EXCEPTION 'A change for this payment is already waiting for approval';
  END IF;
  SELECT btrim(first_name||' '||coalesce(last_name,'')) INTO v_name FROM students WHERE id = v_inv.student_id;
  INSERT INTO invoice_action_requests(invoice_id, action_type, request_data, requested_by_email, invoice_number, student_name, status)
  VALUES (v_pay.invoice_id, 'payment_amount', jsonb_build_object('payment_id', v_pay.id, 'payment_number', v_pay.payment_number, 'old_amount', v_pay.amount, 'new_amount', v_pay.proof_scan_amount),
    v_actor, v_inv.invoice_number, coalesce(v_name, v_inv.customer_name, ''), 'pending');
  RETURN 'requested';
END $function$;

-- Superadmin approves a pending scanned-amount change
CREATE OR REPLACE FUNCTION public.approve_scanned_payment_amount(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r invoice_action_requests%ROWTYPE; v_actor text := auth.jwt()->>'email'; v_amt numeric; v_pid uuid;
BEGIN
  IF v_actor IS NULL OR NOT public.is_superadmin(v_actor) THEN RAISE EXCEPTION 'Superadmin only'; END IF;
  SELECT * INTO r FROM invoice_action_requests WHERE id = p_request_id AND action_type='payment_amount' AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  v_pid := (r.request_data->>'payment_id')::uuid; v_amt := (r.request_data->>'new_amount')::numeric;
  INSERT INTO payment_amount_corrections(source, submission_id, invoice_id, old_total, new_total, evidence, created_by)
  SELECT 'payment_rescan', id, invoice_id, amount, v_amt, 'Approved rescan request by '||coalesce(r.requested_by_email,''), v_actor FROM payments WHERE id = v_pid;
  UPDATE payments SET amount = v_amt, proof_scan_status = 'match', updated_at = now() WHERE id = v_pid;
  UPDATE invoice_action_requests SET status='approved', reviewed_by=v_actor, reviewed_at=now() WHERE id = p_request_id;
END $function$;

GRANT EXECUTE ON FUNCTION public.apply_scanned_payment_amount(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_scanned_payment_amount(uuid) TO authenticated;