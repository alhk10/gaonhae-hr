CREATE OR REPLACE FUNCTION public._guards_auto_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv uuid; v_rate numeric; v_it jsonb; v_sub numeric := 0; v_tax numeric := 0; v_line numeric; v_ltax numeric;
BEGIN
  IF NEW.sale_status <> 'verified' OR NEW.matched_student_id IS NULL OR NEW.invoice_id IS NOT NULL
     OR COALESCE(OLD.sale_status,'') = 'verified' THEN RETURN NEW; END IF;
  -- Only limited-edition-only carts are invoiced here; other guards carts keep the staff flow.
  IF jsonb_typeof(NEW.items) <> 'array' OR jsonb_array_length(NEW.items) = 0 OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.items) e
    WHERE COALESCE(e->>'key','') NOT LIKE 'le:%' OR NULLIF(e->>'product_id','') IS NULL) THEN RETURN NEW; END IF;
  v_rate := CASE WHEN COALESCE(NEW.gst_amount,0) > 0 THEN 0.09 ELSE 0 END;
  v_inv := gen_random_uuid();
  INSERT INTO invoices (id, invoice_number, student_id, branch_id, customer_type, issue_date, due_date, status,
    subtotal, tax_amount, total_amount, amount_paid, balance_due, discount_amount, notes, internal_notes)
  VALUES (v_inv, _next_invoice_number(), NEW.matched_student_id, NEW.branch_id, 'student', CURRENT_DATE, CURRENT_DATE + 30, 'verified',
    0, 0, 0, 0, 0, 0, 'Created from guards purchase ' || COALESCE(NEW.reference_number,''),
    'Payment via ' || COALESCE(NEW.payment_method,'') || ' (auto-verified from screenshot). Proof: ' || COALESCE(NEW.proof_url,''));
  FOR v_it IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
    v_line := round((v_it->>'unit_price_inc')::numeric * COALESCE((v_it->>'qty')::numeric,1), 2);
    v_ltax := CASE WHEN v_rate > 0 THEN _tax_floor(v_line * v_rate) ELSE 0 END;
    INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, tax_rate, tax_amount, total_amount, size_variant, metadata)
    VALUES (v_inv, (v_it->>'product_id')::uuid, v_it->>'label', COALESCE((v_it->>'qty')::int,1), (v_it->>'unit_price_inc')::numeric,
      v_rate, v_ltax, v_line + v_ltax, NULLIF(concat_ws(' / ', NULLIF(v_it->>'design',''), NULLIF(v_it->>'size','')),''),
      jsonb_build_object('limited_edition', true, 'design', v_it->>'design', 'size', v_it->>'size'));
    v_sub := v_sub + v_line; v_tax := v_tax + v_ltax;
  END LOOP;
  -- Match the amount the family actually paid (order total) so the invoice shows fully paid.
  UPDATE invoices SET subtotal = v_sub, tax_amount = NEW.total - v_sub, total_amount = NEW.total,
    amount_paid = NEW.total, balance_due = 0, status = 'verified' WHERE id = v_inv;
  UPDATE guards_purchases SET invoice_id = v_inv WHERE id = NEW.id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._guards_auto_invoice() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_guards_auto_invoice AFTER INSERT OR UPDATE OF sale_status ON public.guards_purchases
FOR EACH ROW EXECUTE FUNCTION public._guards_auto_invoice();
-- Backfill: invoice already auto-verified, matched limited-edition orders.
UPDATE public.guards_purchases SET sale_status = 'pending_verification' WHERE id IN ('ae839d33-809e-4fb7-b00c-ca0d1bc06f94','aceabbba-771f-4643-9dc4-259e7e247b95') AND invoice_id IS NULL;
UPDATE public.guards_purchases SET sale_status = 'verified' WHERE id IN ('ae839d33-809e-4fb7-b00c-ca0d1bc06f94','aceabbba-771f-4643-9dc4-259e7e247b95') AND invoice_id IS NULL;