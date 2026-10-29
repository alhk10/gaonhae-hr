CREATE OR REPLACE FUNCTION public.access_invoice_payments(p_password text, p_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_scope text := _access_scope(p_password); v_branch uuid;
BEGIN
  IF v_scope IS NULL THEN RAISE EXCEPTION 'Invalid password'; END IF;
  SELECT branch_id INTO v_branch FROM invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN RETURN '[]'::jsonb; END IF;
  IF v_scope <> '*' AND NOT _scope_has(v_scope, v_branch::text) THEN RAISE EXCEPTION 'Not your branch'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', id, 'payment_number', payment_number, 'payment_date', payment_date, 'amount', amount,
    'payment_method', payment_method, 'reference_number', reference_number,
    'verification_status', verification_status, 'is_verified', is_verified,
    'proof_of_payment_url', proof_of_payment_url, 'extra_proofs', extra_proofs,
    'proof_scan_amount', proof_scan_amount, 'notes', notes, 'created_at', created_at)
    ORDER BY payment_date, created_at) FROM payments WHERE invoice_id = p_invoice_id), '[]'::jsonb);
END $$;
GRANT EXECUTE ON FUNCTION public.access_invoice_payments(text, uuid) TO anon, authenticated;