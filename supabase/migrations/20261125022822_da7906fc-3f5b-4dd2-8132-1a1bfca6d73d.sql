CREATE OR REPLACE FUNCTION public._le_line_normalize() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_le record; v_design text; v_size text;
BEGIN
  SELECT id, name INTO v_le FROM limited_edition_products WHERE product_id = NEW.product_id LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  v_design := NULLIF(COALESCE(NEW.metadata->>'design', NEW.metadata->>'color_variant'), '');
  v_size := NULLIF(COALESCE(NEW.metadata->>'size', NEW.size_variant), '');
  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object('limited_edition', true)
    || CASE WHEN v_design IS NOT NULL THEN jsonb_build_object('design', v_design, 'color_variant', v_design) ELSE '{}'::jsonb END;
  NEW.description := 'Limited Edition - ' || v_le.name
    || CASE WHEN v_design IS NOT NULL OR v_size IS NOT NULL THEN ' (' || concat_ws(' / ', v_design, v_size) || ')' ELSE '' END;
  IF COALESCE(NEW.tax_rate, 0) > 0 AND NEW.metadata->'line_discount' IS NULL AND COALESCE(NEW.unit_price, 0) > 0 THEN
    NEW.total_amount := round(round(NEW.unit_price * (1 + NEW.tax_rate), 2) * NEW.quantity, 2);
    NEW.tax_amount := NEW.total_amount - round(NEW.unit_price * NEW.quantity, 2);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public._le_invoice_total() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_tot numeric; v_tax numeric;
BEGIN
  IF COALESCE(NEW.discount_amount, 0) <> 0 THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM invoice_items ii JOIN limited_edition_products l ON l.product_id = ii.product_id WHERE ii.invoice_id = NEW.id) THEN RETURN NEW; END IF;
  SELECT round(SUM(total_amount), 2), round(SUM(COALESCE(tax_amount, 0)), 2) INTO v_tot, v_tax FROM invoice_items WHERE invoice_id = NEW.id;
  IF v_tot IS NULL OR v_tot = NEW.total_amount THEN RETURN NEW; END IF;
  NEW.total_amount := v_tot; NEW.tax_amount := v_tax; NEW.subtotal := v_tot - v_tax;
  NEW.balance_due := GREATEST(v_tot - COALESCE(NEW.amount_paid, 0) - COALESCE(NEW.refunded_amount, 0) * 0, 0);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public._le_sync_invoice(p_inv uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv record; v_st record; v_items jsonb; v_sub numeric; v_tax numeric; v_tot numeric; v_status text;
BEGIN
  SELECT * INTO v_inv FROM invoices WHERE id = p_inv;
  IF NOT FOUND THEN DELETE FROM guards_purchases WHERE invoice_id = p_inv AND notes = 'Staff invoice'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM guards_purchases WHERE invoice_id = p_inv AND COALESCE(notes, '') <> 'Staff invoice') THEN RETURN; END IF;
  SELECT jsonb_agg(jsonb_build_object(
      'key', 'le:' || l.id || ':' || COALESCE(ii.metadata->>'design', '') || ':' || COALESCE(NULLIF(ii.metadata->>'size', ''), ii.size_variant, ''),
      'label', ii.description, 'product_id', ii.product_id, 'qty', ii.quantity, 'unit_price_inc', ii.unit_price,
      'design', ii.metadata->>'design', 'size', COALESCE(NULLIF(ii.metadata->>'size', ''), ii.size_variant)) ORDER BY ii.created_at),
    SUM(round(ii.unit_price * ii.quantity, 2)), SUM(COALESCE(ii.tax_amount, 0)), SUM(ii.total_amount)
  INTO v_items, v_sub, v_tax, v_tot
  FROM invoice_items ii JOIN limited_edition_products l ON l.product_id = ii.product_id WHERE ii.invoice_id = p_inv;
  IF v_items IS NULL OR v_inv.student_id IS NULL THEN
    DELETE FROM guards_purchases WHERE invoice_id = p_inv AND notes = 'Staff invoice'; RETURN;
  END IF;
  SELECT * INTO v_st FROM students WHERE id = v_inv.student_id;
  v_status := CASE WHEN v_inv.status IN ('paid', 'verified') THEN 'verified' WHEN v_inv.status = 'cancelled' THEN 'cancelled' ELSE 'pending_verification' END;
  UPDATE guards_purchases SET items = v_items, subtotal = v_sub, gst_amount = v_tax, total = v_tot, sale_status = v_status,
    matched_student_id = v_inv.student_id, branch_id = COALESCE(v_inv.issued_at_branch, v_inv.branch_id), updated_at = now()
  WHERE invoice_id = p_inv AND notes = 'Staff invoice';
  IF NOT FOUND THEN
    INSERT INTO guards_purchases (first_name, last_name, date_of_birth, branch_id, gender, current_belt, email, phone, items,
      subtotal, gst_amount, total, payment_method, sale_status, matched_student_id, invoice_id, notes)
    VALUES (COALESCE(v_st.first_name, ''), COALESCE(v_st.last_name, ''), v_st.date_of_birth, COALESCE(v_inv.issued_at_branch, v_inv.branch_id),
      v_st.gender, v_st.current_belt, v_st.email, v_st.phone, v_items, v_sub, v_tax, v_tot, 'invoice', v_status, v_inv.student_id, p_inv, 'Staff invoice');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public._le_sync_invoice(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._le_items_after() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM limited_edition_products WHERE product_id IN (COALESCE(NEW.product_id, OLD.product_id), COALESCE(OLD.product_id, NEW.product_id))) THEN RETURN NULL; END IF;
  UPDATE invoices SET updated_at = now() WHERE id = v_inv;
  PERFORM _le_sync_invoice(v_inv);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public._le_invoice_after() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM guards_purchases WHERE invoice_id = NEW.id AND notes = 'Staff invoice') THEN PERFORM _le_sync_invoice(NEW.id); END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS zz_le_line_normalize ON public.invoice_items;
CREATE TRIGGER zz_le_line_normalize BEFORE INSERT OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public._le_line_normalize();
DROP TRIGGER IF EXISTS zz_le_items_after ON public.invoice_items;
CREATE TRIGGER zz_le_items_after AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public._le_items_after();
DROP TRIGGER IF EXISTS zz_le_invoice_total ON public.invoices;
CREATE TRIGGER zz_le_invoice_total BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public._le_invoice_total();
DROP TRIGGER IF EXISTS zz_le_invoice_after ON public.invoices;
CREATE TRIGGER zz_le_invoice_after AFTER UPDATE OF status ON public.invoices FOR EACH ROW EXECUTE FUNCTION public._le_invoice_after();

-- Backfill existing staff invoices with Limited Edition lines (skips /hello-linked ones in sync)
UPDATE public.invoice_items ii SET updated_at = now()
FROM public.limited_edition_products l
WHERE l.product_id = ii.product_id
  AND NOT EXISTS (SELECT 1 FROM public.guards_purchases g WHERE g.invoice_id = ii.invoice_id);

-- INV-202611-0110: payment proof shows $60.00
UPDATE public.payments SET amount = 60, proof_scan_status = 'match', updated_at = now()
WHERE id = '02386d8d-24bb-4571-b96b-775e65036c7c';