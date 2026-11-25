CREATE OR REPLACE FUNCTION public._le_items_after()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_inv uuid := COALESCE(NEW.invoice_id, OLD.invoice_id); v_notes text; v_ref text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM limited_edition_products WHERE product_id IN (COALESCE(NEW.product_id, OLD.product_id), COALESCE(OLD.product_id, NEW.product_id))) THEN RETURN NULL; END IF;
  -- Invoices made from an existing order link to that order instead of creating a second one.
  SELECT notes INTO v_notes FROM invoices WHERE id = v_inv;
  IF v_notes LIKE 'Created from guards purchase %' THEN
    v_ref := btrim(substring(v_notes from 'Created from guards purchase (\S+)'));
    DELETE FROM guards_purchases WHERE invoice_id = v_inv AND notes = 'Staff invoice';
    UPDATE guards_purchases SET invoice_id = v_inv
     WHERE invoice_id IS NULL AND (reference_number = v_ref OR id::text = v_ref)
       AND NOT EXISTS (SELECT 1 FROM guards_purchases g2 WHERE g2.invoice_id = v_inv);
    RETURN NULL;
  END IF;
  UPDATE invoices SET updated_at = now() WHERE id = v_inv;
  PERFORM _le_sync_invoice(v_inv);
  RETURN NULL;
END $function$;