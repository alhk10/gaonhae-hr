CREATE OR REPLACE FUNCTION public._auto_verify_invoice_payments(p_invoice_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inv public.invoices%ROWTYPE; v_sum numeric; v_pending int;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND OR inv.status IN ('cancelled','void','refunded','draft') THEN RETURN false; END IF;
  SELECT COALESCE(SUM(public._payment_counted_amount(p)),0),
         COUNT(*) FILTER (WHERE COALESCE(verification_status,'pending') = 'pending' AND payment_method <> 'credit')
    INTO v_sum, v_pending
    FROM public.payments p
   WHERE invoice_id = p_invoice_id AND COALESCE(verification_status,'pending') <> 'rejected';
  IF v_pending = 0 OR round(v_sum,2) <> round(COALESCE(inv.total_amount,0),2) THEN RETURN false; END IF;
  -- every pending non-cash payment needs a scanned proof
  IF EXISTS (SELECT 1 FROM public.payments p WHERE invoice_id = p_invoice_id
      AND COALESCE(verification_status,'pending') = 'pending' AND payment_method NOT IN ('credit','cash')
      AND (p.proof_scan_amount IS NULL OR p.proof_scan_status IS NULL)) THEN RETURN false; END IF;
  PERFORM set_config('app.auto_verify_invoice', 'on', true);
  UPDATE public.payments p
     SET amount = public._payment_counted_amount(p),
         is_verified = true, verification_status = 'verified', verified_by = 'auto_scan', verified_at = now(),
         proof_scan_details = COALESCE(p.proof_scan_details,'{}'::jsonb) || jsonb_build_object(
           'auto_verified_combined', true, 'original_amount', p.amount,
           'reason', 'All payments on invoice add up to invoice total')
   WHERE invoice_id = p_invoice_id AND COALESCE(verification_status,'pending') = 'pending' AND payment_method <> 'credit';
  PERFORM set_config('app.auto_verify_invoice', 'off', true);
  PERFORM public.recalc_invoice_from_payments(p_invoice_id);
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_invoice_status_from_payments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE inv_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id); v_status text;
BEGIN
  IF inv_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT status INTO v_status FROM public.invoices WHERE id = inv_id;
  IF NOT FOUND OR v_status IN ('cancelled','void','refunded') THEN RETURN COALESCE(NEW, OLD); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = inv_id) THEN RETURN COALESCE(NEW, OLD); END IF;
  PERFORM public.recalc_invoice_from_payments(inv_id);
  IF TG_OP <> 'DELETE' AND COALESCE(current_setting('app.auto_verify_invoice', true),'off') <> 'on' THEN
    PERFORM public._auto_verify_invoice_payments(inv_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $function$;

REVOKE ALL ON FUNCTION public._auto_verify_invoice_payments(uuid) FROM PUBLIC, anon, authenticated;