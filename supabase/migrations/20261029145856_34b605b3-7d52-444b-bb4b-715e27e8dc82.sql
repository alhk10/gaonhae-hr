CREATE OR REPLACE FUNCTION public.admin_reverse_student_credit(p_credit_id uuid, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_email text; v_new uuid; v_pay uuid; v_ref uuid; v_status text;
BEGIN
  IF public.get_current_user_role() IS DISTINCT FROM 'superadmin' THEN RAISE EXCEPTION 'Only superadmin can reverse credits'; END IF;
  IF coalesce(trim(p_reason),'') = '' THEN RAISE EXCEPTION 'Reason is required'; END IF;
  SELECT * INTO c FROM student_credits WHERE id = p_credit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit line not found'; END IF;
  IF c.reference_id LIKE 'reversal:%' THEN RAISE EXCEPTION 'A reversal cannot be reversed'; END IF;
  IF c.type IN ('credit_hold','credit_hold_released','refund_pending') THEN RAISE EXCEPTION 'This line cannot be reversed'; END IF;
  IF EXISTS (SELECT 1 FROM student_credits WHERE reference_id = 'reversal:' || p_credit_id) THEN RAISE EXCEPTION 'Already reversed'; END IF;
  IF c.amount > 0 AND c.reference_id ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
    v_ref := (substring(c.reference_id from '(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'))::uuid;
    SELECT status INTO v_status FROM invoices WHERE id = v_ref;
    IF v_status IS NULL THEN
      SELECT i.status INTO v_status FROM invoice_items it JOIN invoices i ON i.id = it.invoice_id WHERE it.id = v_ref;
    END IF;
    IF v_status = 'cancelled' THEN RAISE EXCEPTION 'Invoice is cancelled — credit stays on account'; END IF;
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF c.type = 'credit_applied' AND c.reference_id ~ '^[0-9a-f-]{36}$' THEN
    SELECT id INTO v_pay FROM payments WHERE invoice_id = c.reference_id::uuid AND payment_method = 'credit'
      AND round(amount,2) = round(abs(c.amount),2) ORDER BY created_at DESC LIMIT 1;
    IF v_pay IS NOT NULL THEN DELETE FROM payments WHERE id = v_pay; END IF;
  END IF;
  INSERT INTO student_credits(student_id, amount, type, reference_id, description, created_by)
  VALUES (c.student_id, -c.amount, 'manual_adjustment', 'reversal:' || p_credit_id,
          'Reversal of: ' || coalesce(c.description,'') || ' — ' || trim(p_reason), coalesce(v_email,'superadmin'))
  RETURNING id INTO v_new;
  INSERT INTO security_audit_log(user_email, action, details)
  VALUES (v_email, 'credit_reversed', jsonb_build_object('credit_id', p_credit_id, 'reversal_id', v_new, 'payment_removed', v_pay, 'reason', p_reason));
  RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.admin_reverse_student_credit(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reverse_student_credit(uuid,text) TO authenticated;