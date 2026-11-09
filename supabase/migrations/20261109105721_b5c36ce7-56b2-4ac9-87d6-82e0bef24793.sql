CREATE OR REPLACE FUNCTION public._auto_verify_invoice_payments(p_invoice_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE inv public.invoices%ROWTYPE; v_sum numeric; v_pending int; v_over numeric; v_ref text;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND OR inv.status IN ('cancelled','void','refunded','draft') THEN RETURN false; END IF;
  SELECT COALESCE(SUM(public._payment_counted_amount(p)),0),
         COUNT(*) FILTER (WHERE COALESCE(verification_status,'pending') = 'pending' AND payment_method <> 'credit')
    INTO v_sum, v_pending
    FROM public.payments p
   WHERE invoice_id = p_invoice_id AND COALESCE(verification_status,'pending') <> 'rejected';
  IF v_pending = 0 OR round(v_sum,2) < round(COALESCE(inv.total_amount,0),2) THEN RETURN false; END IF;
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
  v_over := round(v_sum - COALESCE(inv.total_amount,0), 2);
  IF v_over > 0 AND inv.student_id IS NOT NULL THEN
    v_ref := 'auto-overpay:' || p_invoice_id::text;
    IF NOT EXISTS (SELECT 1 FROM public.student_credits WHERE type='overpayment' AND reference_id=v_ref) THEN
      INSERT INTO public.student_credits(student_id, amount, type, reference_id, description, created_by)
      VALUES (inv.student_id, v_over, 'overpayment', v_ref, 'Overpayment on Invoice #' || inv.invoice_number, 'auto_scan');
    END IF;
  END IF;
  PERFORM public.recalc_invoice_from_payments(p_invoice_id);
  IF v_over > 0 THEN
    UPDATE public.invoices SET balance_due = 0 WHERE id = p_invoice_id AND balance_due <> 0;
  END IF;
  RETURN true;
END; $function$;
REVOKE EXECUTE ON FUNCTION public._auto_verify_invoice_payments(uuid) FROM PUBLIC, anon, authenticated;