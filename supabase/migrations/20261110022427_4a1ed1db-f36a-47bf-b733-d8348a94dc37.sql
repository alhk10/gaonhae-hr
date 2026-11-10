CREATE OR REPLACE FUNCTION public.apply_student_credit_to_invoice(p_invoice_id uuid, p_amount numeric, p_client_ref text DEFAULT NULL, p_password text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv invoices%ROWTYPE; v_id uuid; v_scope text; v_by text; v_email text := lower(coalesce(auth.jwt()->>'email','')); v_avail numeric; v_amt numeric := round(coalesce(p_amount,0),2);
BEGIN
  IF nullif(p_password,'') IS NOT NULL THEN
    v_scope := _access_scope(p_password);
    IF v_scope IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;
    v_by := CASE WHEN v_scope='*' THEN 'access (all branches)' ELSE 'access (' || v_scope || ')' END;
  ELSIF v_email <> '' AND (is_superadmin(v_email) OR EXISTS (SELECT 1 FROM employees e WHERE lower(e.email)=v_email)) THEN
    v_by := v_email;
  ELSE RAISE EXCEPTION 'Not authorised'; END IF;

  IF nullif(p_client_ref,'') IS NOT NULL THEN
    SELECT id INTO v_id FROM payments WHERE client_ref=p_client_ref AND invoice_id=p_invoice_id;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_scope IS NOT NULL AND v_scope <> '*' AND NOT _scope_has(v_scope, v_inv.branch_id::text) THEN RAISE EXCEPTION 'Not your branch'; END IF;
  IF v_inv.student_id IS NULL THEN RAISE EXCEPTION 'Invoice has no student'; END IF;
  IF v_inv.status IN ('cancelled','refunded','void') THEN RAISE EXCEPTION 'Invoice is %', v_inv.status; END IF;
  PERFORM 1 FROM students WHERE id=v_inv.student_id FOR UPDATE;
  v_avail := get_student_available_credit(v_inv.student_id);
  IF v_amt <= 0 THEN RAISE EXCEPTION 'Amount must be more than 0'; END IF;
  IF v_amt > round(v_avail,2) + 0.005 THEN RAISE EXCEPTION 'Only $% credit available', round(v_avail,2); END IF;
  IF v_amt > coalesce(v_inv.balance_due,0) + 0.005 THEN RAISE EXCEPTION 'Amount exceeds the balance due'; END IF;

  INSERT INTO payments(invoice_id, payment_number, payment_method, amount, payment_date, notes, processed_by, created_by, updated_by,
    is_verified, verification_status, verified_by, verified_at, client_ref)
  VALUES (p_invoice_id, 'PAY-CR-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text,1,6), 'credit', v_amt, current_date,
    'Paid with student credit', v_by, v_by, v_by, true, 'verified', v_by, now(), nullif(p_client_ref,''))
  RETURNING id INTO v_id;

  INSERT INTO student_credits(student_id, amount, type, reference_id, description, created_by)
  VALUES (v_inv.student_id, -v_amt, 'credit_applied', p_invoice_id, 'Applied to ' || v_inv.invoice_number, v_by);

  INSERT INTO invoice_change_logs(invoice_id, action, changed_by_email, changes)
  VALUES (p_invoice_id, 'credit_applied', v_by, jsonb_build_object('amount', v_amt, 'payment_id', v_id));

  PERFORM recalc_invoice_from_payments(p_invoice_id);
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.apply_student_credit_to_invoice(uuid, numeric, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_student_credit_to_invoice(uuid, numeric, text, text) TO anon, authenticated;