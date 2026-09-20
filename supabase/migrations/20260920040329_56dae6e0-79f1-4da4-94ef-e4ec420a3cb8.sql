-- GST rate helper
CREATE OR REPLACE FUNCTION public.gst_rate_for_branch(p_branch_id text)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce((SELECT b.country FROM public.branches b WHERE b.id = p_branch_id), ''))
           WHEN 'singapore' THEN 0.09
           WHEN 'australia' THEN 0.10
           ELSE 0
         END;
$$;

-- Derive GST on invoice lines that were inserted without any tax information.
-- The stored total_amount is treated as the GST-inclusive amount collected.
CREATE OR REPLACE FUNCTION public.tg_invoice_items_gst()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_branch text;
  v_gross numeric;
BEGIN
  IF coalesce(NEW.tax_rate, 0) <> 0 OR coalesce(NEW.tax_amount, 0) <> 0 THEN
    RETURN NEW;
  END IF;

  SELECT i.branch_id INTO v_branch FROM public.invoices i WHERE i.id = NEW.invoice_id;
  v_rate := public.gst_rate_for_branch(v_branch);
  IF v_rate = 0 THEN RETURN NEW; END IF;

  v_gross := coalesce(NEW.total_amount, 0);
  IF v_gross <= 0 THEN RETURN NEW; END IF;

  NEW.tax_rate := v_rate;
  NEW.tax_amount := round(v_gross - v_gross / (1 + v_rate), 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoice_items_gst ON public.invoice_items;
CREATE TRIGGER invoice_items_gst
BEFORE INSERT ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.tg_invoice_items_gst();

-- Derive the GST split on invoice headers written without tax (public import RPCs).
CREATE OR REPLACE FUNCTION public.tg_invoices_gst()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_tax numeric;
BEGIN
  IF coalesce(NEW.tax_amount, 0) <> 0 THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND coalesce(NEW.created_at, now()) < timestamptz '2026-09-20 03:00:00+00' THEN
    RETURN NEW;
  END IF;

  v_rate := public.gst_rate_for_branch(NEW.branch_id);
  IF v_rate = 0 OR coalesce(NEW.total_amount, 0) <= 0 THEN RETURN NEW; END IF;

  v_tax := round(NEW.total_amount - NEW.total_amount / (1 + v_rate), 2);
  NEW.tax_amount := v_tax;
  NEW.subtotal := round(NEW.total_amount - v_tax, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_gst ON public.invoices;
CREATE TRIGGER invoices_gst
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.tg_invoices_gst();

-- Backfill: add GST on top of open (unpaid) Singapore/Australia invoices that carry no tax.
WITH targets AS (
  SELECT i.id, public.gst_rate_for_branch(i.branch_id) AS rate
  FROM public.invoices i
  WHERE coalesce(i.tax_amount, 0) = 0
    AND i.status IN ('draft', 'sent', 'overdue', 'partial')
    AND coalesce(i.total_amount, 0) > 0
    AND public.gst_rate_for_branch(i.branch_id) > 0
)
UPDATE public.invoice_items ii
SET tax_rate = t.rate,
    tax_amount = round(ii.total_amount * t.rate, 2),
    total_amount = round(ii.total_amount * (1 + t.rate), 2),
    updated_at = now()
FROM targets t
WHERE ii.invoice_id = t.id
  AND coalesce(ii.tax_amount, 0) = 0
  AND coalesce(ii.total_amount, 0) <> 0;

WITH targets AS (
  SELECT i.id, public.gst_rate_for_branch(i.branch_id) AS rate
  FROM public.invoices i
  WHERE coalesce(i.tax_amount, 0) = 0
    AND i.status IN ('draft', 'sent', 'overdue', 'partial')
    AND coalesce(i.total_amount, 0) > 0
    AND public.gst_rate_for_branch(i.branch_id) > 0
)
UPDATE public.invoices i
SET tax_amount = round(i.total_amount * t.rate, 2),
    total_amount = round(i.total_amount * (1 + t.rate), 2),
    balance_due = round(i.total_amount * (1 + t.rate), 2) - coalesce(i.amount_paid, 0),
    updated_at = now()
FROM targets t
WHERE i.id = t.id;