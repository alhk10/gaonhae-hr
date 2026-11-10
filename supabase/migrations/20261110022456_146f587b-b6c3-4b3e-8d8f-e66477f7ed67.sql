CREATE OR REPLACE FUNCTION public.access_invoice_student_credit(p_password text, p_invoice_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_scope text := _access_scope(p_password); v_inv invoices%ROWTYPE;
BEGIN
  IF v_scope IS NULL THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id;
  IF NOT FOUND OR v_inv.student_id IS NULL THEN RETURN 0; END IF;
  IF v_scope <> '*' AND NOT _scope_has(v_scope, v_inv.branch_id::text) THEN RAISE EXCEPTION 'Not your branch'; END IF;
  RETURN round(greatest(get_student_available_credit(v_inv.student_id),0),2);
END $$;
REVOKE ALL ON FUNCTION public.access_invoice_student_credit(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.access_invoice_student_credit(text, uuid) TO anon, authenticated;