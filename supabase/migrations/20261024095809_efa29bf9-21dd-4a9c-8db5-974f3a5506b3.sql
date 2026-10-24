CREATE OR REPLACE FUNCTION public.recalc_invoice_from_payments(p_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  inv public.invoices%ROWTYPE;
  v_paid numeric; v_bal numeric; v_any boolean; v_all boolean; v_status text;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND OR inv.status = 'cancelled' THEN RETURN; END IF;
  SELECT COALESCE(SUM(amount),0), COUNT(*) > 0,
         COUNT(*) > 0 AND bool_and(verification_status = 'verified')
    INTO v_paid, v_any, v_all
    FROM public.payments
   WHERE invoice_id = p_invoice_id AND COALESCE(verification_status,'pending') <> 'rejected';
  v_bal := GREATEST(0, round(COALESCE(inv.total_amount,0) - v_paid, 2));
  v_status := CASE WHEN v_bal > 0.009 THEN (CASE WHEN v_paid > 0 THEN 'partially_paid' ELSE 'unpaid' END)
                   WHEN v_all THEN 'verified' ELSE 'paid' END;
  UPDATE public.invoices SET amount_paid = v_paid, balance_due = v_bal, status = v_status, updated_at = now()
   WHERE id = p_invoice_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice_from_payments(uuid) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.after_auto_scan_verified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.invoice_id IS NULL THEN RETURN NEW; END IF;
  UPDATE public.payments
     SET is_verified = true, verification_status = 'verified', verified_by = 'auto_scan', verified_at = now()
   WHERE invoice_id = NEW.invoice_id AND payment_method = 'credit'
     AND COALESCE(verification_status,'pending') = 'pending';
  BEGIN
    PERFORM public.consume_credit_hold(NEW.invoice_id, 'auto_scan');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'consume_credit_hold failed for %: %', NEW.invoice_id, SQLERRM;
  END;
  PERFORM public.recalc_invoice_from_payments(NEW.invoice_id);
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.after_auto_scan_verified() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_after_auto_scan_verified ON public.payments;
CREATE TRIGGER trg_after_auto_scan_verified
AFTER UPDATE OF verification_status ON public.payments
FOR EACH ROW
WHEN (NEW.verified_by = 'auto_scan' AND NEW.verification_status = 'verified'
      AND OLD.verification_status IS DISTINCT FROM 'verified' AND NEW.payment_method <> 'credit')
EXECUTE FUNCTION public.after_auto_scan_verified();

-- Catch up invoices whose payments were already auto-verified
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT invoice_id FROM public.payments
           WHERE verified_by = 'auto_scan' AND invoice_id IS NOT NULL LOOP
    BEGIN PERFORM public.consume_credit_hold(r.invoice_id, 'auto_scan'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM public.recalc_invoice_from_payments(r.invoice_id);
  END LOOP;
END $$;