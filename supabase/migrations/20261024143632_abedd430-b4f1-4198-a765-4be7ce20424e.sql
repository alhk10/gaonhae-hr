CREATE OR REPLACE FUNCTION public.sync_invoice_status_from_payments()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  inv_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  v_status text;
BEGIN
  IF inv_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT status INTO v_status FROM public.invoices WHERE id = inv_id;
  IF NOT FOUND OR v_status IN ('cancelled','void','refunded') THEN RETURN COALESCE(NEW, OLD); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = inv_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  PERFORM public.recalc_invoice_from_payments(inv_id);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_after_auto_scan_verified ON public.payments;
CREATE TRIGGER trg_after_auto_scan_verified
AFTER UPDATE ON public.payments
FOR EACH ROW
WHEN (NEW.verified_by = 'auto_scan' AND NEW.verification_status = 'verified'
      AND OLD.verification_status IS DISTINCT FROM 'verified' AND NEW.payment_method <> 'credit')
EXECUTE FUNCTION public.after_auto_scan_verified();