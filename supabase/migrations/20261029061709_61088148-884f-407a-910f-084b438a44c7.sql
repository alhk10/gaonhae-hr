CREATE OR REPLACE FUNCTION public._payment_counted_amount(p public.payments)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN p.proof_scan_status = 'mismatch' AND COALESCE(p.verification_status,'pending') = 'pending'
              AND p.proof_scan_amount IS NOT NULL AND p.proof_scan_amount < p.amount
         THEN p.proof_scan_amount ELSE p.amount END
$$;

CREATE OR REPLACE FUNCTION public.recalc_invoice_from_payments(p_invoice_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  inv public.invoices%ROWTYPE;
  v_paid numeric; v_bal numeric; v_any boolean; v_all boolean; v_status text;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND OR inv.status = 'cancelled' THEN RETURN; END IF;
  SELECT COALESCE(SUM(public._payment_counted_amount(p)),0), COUNT(*) > 0,
         COUNT(*) > 0 AND bool_and(verification_status = 'verified')
    INTO v_paid, v_any, v_all
    FROM public.payments p
   WHERE invoice_id = p_invoice_id AND COALESCE(verification_status,'pending') <> 'rejected';
  v_bal := GREATEST(0, round(COALESCE(inv.total_amount,0) - v_paid, 2));
  v_status := CASE WHEN v_bal > 0.009 THEN (CASE WHEN v_paid > 0 THEN 'partially_paid' ELSE 'unpaid' END)
                   WHEN v_all THEN 'verified' ELSE 'paid' END;
  UPDATE public.invoices SET amount_paid = v_paid, balance_due = v_bal, status = v_status, updated_at = now()
   WHERE id = p_invoice_id;
END; $function$;

CREATE OR REPLACE FUNCTION public._payment_shortage_rows()
RETURNS TABLE(payment_id uuid, invoice_id uuid, invoice_number text, student_name text, branch_id text, branch_name text,
  country text, amount numeric, scanned_amount numeric, shortfall numeric, balance_due numeric, payment_method text,
  proof_url text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.id, i.id, i.invoice_number,
    upper(coalesce(nullif(s.display_name,''), trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')))),
    i.branch_id::text, b.name, b.country::text, p.amount, p.proof_scan_amount, round(p.amount - p.proof_scan_amount, 2),
    i.balance_due, p.payment_method, p.proof_of_payment_url, p.created_at
  FROM public.payments p
  JOIN public.invoices i ON i.id = p.invoice_id
  LEFT JOIN public.students s ON s.id = i.student_id
  LEFT JOIN public.branches b ON b.id::text = i.branch_id::text
  WHERE p.proof_scan_status = 'mismatch' AND COALESCE(p.verification_status,'pending') = 'pending'
    AND p.proof_scan_amount IS NOT NULL AND p.proof_scan_amount < p.amount
  ORDER BY p.created_at
$$;
REVOKE ALL ON FUNCTION public._payment_shortage_rows() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.access_list_payment_shortages(p_password text)
RETURNS SETOF record LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN RAISE EXCEPTION 'unused'; END $$;
DROP FUNCTION public.access_list_payment_shortages(text);

CREATE FUNCTION public.access_list_payment_shortages(p_password text)
RETURNS TABLE(payment_id uuid, invoice_id uuid, invoice_number text, student_name text, branch_id text, branch_name text,
  country text, amount numeric, scanned_amount numeric, shortfall numeric, balance_due numeric, payment_method text,
  proof_url text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_scope text := public._access_scope(p_password);
BEGIN
  RETURN QUERY SELECT * FROM public._payment_shortage_rows() r WHERE public._scope_has(v_scope, r.branch_id);
END $$;
GRANT EXECUTE ON FUNCTION public.access_list_payment_shortages(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_payment_shortages()
RETURNS TABLE(payment_id uuid, invoice_id uuid, invoice_number text, student_name text, branch_id text, branch_name text,
  country text, amount numeric, scanned_amount numeric, shortfall numeric, balance_due numeric, payment_method text,
  proof_url text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_superadmin(auth.jwt()->>'email') THEN RAISE EXCEPTION 'Superadmin only'; END IF;
  RETURN QUERY SELECT * FROM public._payment_shortage_rows();
END $$;
REVOKE ALL ON FUNCTION public.admin_list_payment_shortages() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_payment_shortages() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_payment_shortage(p_payment_id uuid, p_action text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.payments; v_who text := auth.jwt()->>'email';
BEGIN
  IF NOT public.is_superadmin(v_who) THEN RAISE EXCEPTION 'Only superadmin can resolve payment shortages'; END IF;
  SELECT * INTO p FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF NOT (p.proof_scan_status = 'mismatch' AND COALESCE(p.verification_status,'pending') = 'pending') THEN
    RAISE EXCEPTION 'This payment shortage has already been resolved'; END IF;
  IF p_action = 'accept_scanned' THEN
    UPDATE public.payments SET amount = p.proof_scan_amount, proof_scan_status = 'shortage_accepted',
      verification_status = 'verified', is_verified = true, verified_at = now(), verified_by = v_who,
      notes = concat_ws(E'\n', notes, format('Shortage: accepted scanned amount %s (was %s) by %s. %s', p.proof_scan_amount, p.amount, v_who, coalesce(p_note,''))),
      updated_at = now(), updated_by = v_who WHERE id = p.id;
  ELSIF p_action = 'confirm_full' THEN
    UPDATE public.payments SET proof_scan_status = 'shortage_overridden',
      verification_status = 'verified', is_verified = true, verified_at = now(), verified_by = v_who,
      notes = concat_ws(E'\n', notes, format('Shortage: full amount %s confirmed by %s. %s', p.amount, v_who, coalesce(p_note,''))),
      updated_at = now(), updated_by = v_who WHERE id = p.id;
  ELSIF p_action = 'reject' THEN
    UPDATE public.payments SET verification_status = 'rejected', is_verified = false,
      verification_rejection_reason = coalesce(p_note, 'Payment shortage rejected'),
      updated_at = now(), updated_by = v_who WHERE id = p.id;
  ELSE RAISE EXCEPTION 'Unknown action %', p_action; END IF;
  PERFORM public.recalc_invoice_from_payments(p.invoice_id);
END $$;
REVOKE ALL ON FUNCTION public.admin_resolve_payment_shortage(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_payment_shortage(uuid, text, text) TO authenticated;

SELECT public.recalc_invoice_from_payments(id) FROM public.invoices WHERE id IN (
  SELECT invoice_id FROM public.payments WHERE proof_scan_status = 'mismatch' AND COALESCE(verification_status,'pending')='pending');