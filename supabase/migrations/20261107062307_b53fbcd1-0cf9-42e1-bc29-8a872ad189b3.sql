CREATE OR REPLACE FUNCTION public.access_delete_draft_invoice(p_password text, p_invoice_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_scope text := _access_scope(p_password); v_inv invoices%ROWTYPE; v_ids uuid[];
BEGIN
  IF v_scope IS NULL THEN RAISE EXCEPTION 'Invalid access password'; END IF;
  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_scope <> '*' AND NOT _scope_has(v_scope, v_inv.branch_id::text) THEN RAISE EXCEPTION 'Not your branch'; END IF;
  IF v_inv.status <> 'draft' THEN RAISE EXCEPTION 'Only draft invoices can be deleted without approval'; END IF;
  SELECT coalesce(array_agg(id),'{}') INTO v_ids FROM invoice_items WHERE invoice_id=p_invoice_id;
  INSERT INTO security_audit_log(user_email, action, details)
  VALUES ('access:' || v_scope, 'draft_invoice_deleted', jsonb_build_object('invoice_id',p_invoice_id,'invoice_number',v_inv.invoice_number,'total',v_inv.total_amount,'reason',p_reason,'scope',v_scope));
  DELETE FROM grading_registrations WHERE invoice_item_id = ANY(v_ids);
  DELETE FROM entitlements WHERE source_type='invoice_item' AND source_id::text = ANY(SELECT unnest(v_ids)::text);
  DELETE FROM payments WHERE invoice_id=p_invoice_id;
  DELETE FROM invoice_items WHERE invoice_id=p_invoice_id;
  DELETE FROM invoices WHERE id=p_invoice_id;
END $function$;