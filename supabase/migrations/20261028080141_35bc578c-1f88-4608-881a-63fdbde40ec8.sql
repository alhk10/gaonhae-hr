CREATE OR REPLACE FUNCTION public.access_delete_draft_invoice(p_password text, p_invoice_id uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_scope text := _access_scope(p_password); v_inv invoices%ROWTYPE; v_ids uuid[];
BEGIN
  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_scope <> '*' AND NOT _scope_has(v_scope, v_inv.branch_id::text) THEN RAISE EXCEPTION 'Not your branch'; END IF;
  IF v_inv.status <> 'draft' THEN RAISE EXCEPTION 'Only draft invoices can be deleted without approval'; END IF;
  SELECT coalesce(array_agg(id),'{}') INTO v_ids FROM invoice_items WHERE invoice_id=p_invoice_id;
  INSERT INTO security_audit_log(action, details) SELECT 'draft_invoice_deleted', jsonb_build_object('invoice_id',p_invoice_id,'invoice_number',v_inv.invoice_number,'total',v_inv.total_amount,'reason',p_reason,'scope',v_scope)
    WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='security_audit_log' AND column_name='details');
  DELETE FROM grading_registrations WHERE invoice_item_id = ANY(v_ids);
  DELETE FROM entitlements WHERE source_type='invoice_item' AND source_id::text = ANY(SELECT unnest(v_ids)::text);
  DELETE FROM payments WHERE invoice_id=p_invoice_id;
  DELETE FROM invoice_items WHERE invoice_id=p_invoice_id;
  DELETE FROM invoices WHERE id=p_invoice_id;
END $$;

CREATE OR REPLACE FUNCTION public.access_apply_draft_invoice_edit(p_password text, p_invoice_id uuid, p_request jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_scope text := _access_scope(p_password); v_inv invoices%ROWTYPE; v_items jsonb := p_request->'editItems'; v_tot jsonb := p_request->'editTotals'; it jsonb;
BEGIN
  SELECT * INTO v_inv FROM invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF v_scope <> '*' AND NOT _scope_has(v_scope, v_inv.branch_id::text) THEN RAISE EXCEPTION 'Not your branch'; END IF;
  IF v_inv.status <> 'draft' THEN RAISE EXCEPTION 'Only draft invoices can be edited without approval'; END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items)=0 OR v_tot IS NULL THEN RAISE EXCEPTION 'Adjustment details are incomplete'; END IF;
  DELETE FROM invoice_items WHERE invoice_id=p_invoice_id AND id::text NOT IN (
    SELECT e->>'id' FROM jsonb_array_elements(v_items) e WHERE coalesce((e->>'isNew')::boolean,false)=false AND e->>'id' IS NOT NULL);
  FOR it IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    IF coalesce((it->>'isNew')::boolean,false) THEN
      IF it->>'product_id' IS NOT NULL THEN
        INSERT INTO invoice_items(invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, size_variant, metadata)
        VALUES (p_invoice_id, (it->>'product_id')::uuid, it->>'description', coalesce((it->>'quantity')::numeric,1), coalesce((it->>'unit_price')::numeric,0),
          coalesce((it->>'tax_rate')::numeric,0), coalesce((it->>'tax_amount')::numeric,0), coalesce((it->>'total_amount')::numeric,0), nullif(it->>'size_variant',''), it->'metadata');
      END IF;
    ELSE
      UPDATE invoice_items SET product_id=(it->>'product_id')::uuid, description=it->>'description', quantity=coalesce((it->>'quantity')::numeric,1),
        unit_price=coalesce((it->>'unit_price')::numeric,0), tax_rate=coalesce((it->>'tax_rate')::numeric,0), tax_amount=coalesce((it->>'tax_amount')::numeric,0),
        total_amount=coalesce((it->>'total_amount')::numeric,0), size_variant=nullif(it->>'size_variant',''), metadata=it->'metadata', updated_at=now()
      WHERE id=(it->>'id')::uuid AND invoice_id=p_invoice_id;
    END IF;
  END LOOP;
  UPDATE invoices SET subtotal=coalesce((v_tot->>'subtotal')::numeric,0), tax_amount=coalesce((v_tot->>'tax')::numeric,0),
    total_amount=coalesce((v_tot->>'total')::numeric,0), balance_due=coalesce((v_tot->>'balanceDue')::numeric,0), updated_at=now() WHERE id=p_invoice_id;
  INSERT INTO invoice_change_logs(invoice_id, action, changes, changed_by_email)
  VALUES (p_invoice_id, 'draft_edit', jsonb_build_object('items', v_items, 'totals', v_tot), CASE WHEN v_scope='*' THEN 'access (all branches)' ELSE 'access ('||v_scope||')' END);
END $$;

GRANT EXECUTE ON FUNCTION public.access_delete_draft_invoice(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.access_apply_draft_invoice_edit(text, uuid, jsonb) TO anon, authenticated;