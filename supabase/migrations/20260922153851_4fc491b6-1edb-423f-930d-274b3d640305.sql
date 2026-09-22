
WITH restore AS (
  SELECT i.id FROM public.invoices i
  JOIN public.status_normalisation_log l ON l.record_id = i.id AND l.new_status = 'paid' AND l.old_status = 'verified'
  WHERE i.status = 'paid'
    AND COALESCE(i.balance_due, 0) <= 0.01
    AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = i.id)
), upd AS (
  UPDATE public.invoices i SET status = 'verified', updated_at = now()
  FROM restore r WHERE i.id = r.id RETURNING i.id
)
INSERT INTO public.status_normalisation_log (table_name, record_id, old_status, new_status, reason)
SELECT 'invoices', id, 'paid', 'verified', 'settled without a payment record; kept as verified' FROM upd;

CREATE OR REPLACE FUNCTION public.sync_invoice_status_from_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices%ROWTYPE;
  new_status text;
  has_payments boolean;
  all_verified boolean;
  inv_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
BEGIN
  IF inv_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = inv_id;
  IF NOT FOUND OR inv.status IN ('cancelled','draft') THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = inv_id),
         NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = inv_id
                     AND COALESCE(p.verification_status, 'pending') <> 'verified')
    INTO has_payments, all_verified;

  IF COALESCE(inv.balance_due, 0) > 0.01 THEN
    new_status := CASE WHEN COALESCE(inv.amount_paid, 0) > 0 THEN 'partially_paid' ELSE 'unpaid' END;
  ELSIF NOT has_payments THEN
    new_status := inv.status;
  ELSIF all_verified THEN
    new_status := 'verified';
  ELSE
    new_status := 'paid';
  END IF;

  IF new_status IS DISTINCT FROM inv.status THEN
    UPDATE public.invoices SET status = new_status, updated_at = now() WHERE id = inv_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_invoice_status_from_payments() FROM PUBLIC, anon, authenticated;
