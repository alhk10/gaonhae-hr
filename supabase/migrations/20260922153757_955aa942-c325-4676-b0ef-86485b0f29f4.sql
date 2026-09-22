
CREATE TABLE IF NOT EXISTS public.status_normalisation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  old_status text,
  new_status text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'status_standardisation'
);
GRANT SELECT ON public.status_normalisation_log TO anon, authenticated;
GRANT ALL ON public.status_normalisation_log TO service_role;
ALTER TABLE public.status_normalisation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view status normalisation log"
  ON public.status_normalisation_log FOR SELECT USING (true);

-- 1. Legacy wording on invoices
WITH mapped AS (
  SELECT id, status AS old_status,
    CASE lower(status)
      WHEN 'sent' THEN 'unpaid'
      WHEN 'partial' THEN 'partially_paid'
      WHEN 'partially paid' THEN 'partially_paid'
      WHEN 'pending' THEN 'unpaid'
      WHEN 'refunded' THEN 'cancelled'
      WHEN 'void' THEN 'cancelled'
      ELSE lower(status)
    END AS new_status
  FROM public.invoices
), changed AS (
  SELECT * FROM mapped WHERE new_status IS DISTINCT FROM old_status
), upd AS (
  UPDATE public.invoices i SET status = c.new_status, updated_at = now()
  FROM changed c WHERE i.id = c.id RETURNING 1
)
INSERT INTO public.status_normalisation_log (table_name, record_id, old_status, new_status, reason)
SELECT 'invoices', id, old_status, new_status, 'legacy status wording' FROM changed;

-- 2. Recompute paid/verified from payment verification
WITH calc AS (
  SELECT i.id, i.status AS old_status,
    CASE
      WHEN COALESCE(i.balance_due, 0) > 0.01 AND COALESCE(i.amount_paid, 0) > 0 THEN 'partially_paid'
      WHEN COALESCE(i.balance_due, 0) > 0.01 THEN 'unpaid'
      WHEN EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = i.id)
           AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = i.id
                           AND COALESCE(p.verification_status, 'pending') <> 'verified')
        THEN 'verified'
      ELSE 'paid'
    END AS new_status
  FROM public.invoices i
  WHERE i.status IN ('paid', 'verified', 'partially_paid', 'unpaid')
), changed AS (
  SELECT * FROM calc WHERE new_status IS DISTINCT FROM old_status
), upd AS (
  UPDATE public.invoices i SET status = c.new_status, updated_at = now()
  FROM changed c WHERE i.id = c.id RETURNING 1
)
INSERT INTO public.status_normalisation_log (table_name, record_id, old_status, new_status, reason)
SELECT 'invoices', id, old_status, new_status, 'recomputed from balance and payment verification' FROM changed;

-- 3. Transaction tables: normalise stray wording
DO $$
DECLARE t record; sql text;
BEGIN
  FOR t IN SELECT * FROM (VALUES
      ('grading_payment_submissions','status'),
      ('competition_payment_submissions','status'),
      ('seminar_payment_submissions','status'),
      ('public_chat_payment_submissions','status'),
      ('guards_purchases','sale_status')
    ) AS v(tbl, col)
  LOOP
    sql := format($f$
      WITH mapped AS (
        SELECT id, %1$I AS old_status,
          CASE lower(%1$I)
            WHEN 'pending' THEN 'pending_verification'
            WHEN 'pending verification' THEN 'pending_verification'
            WHEN 'awaiting_verification' THEN 'pending_verification'
            WHEN 'paid' THEN 'pending_verification'
            WHEN 'confirmed' THEN 'verified'
            WHEN 'approved' THEN 'verified'
            WHEN 'declined' THEN 'rejected'
            WHEN 'void' THEN 'cancelled'
            ELSE lower(%1$I)
          END AS new_status
        FROM public.%2$I
      ), changed AS (SELECT * FROM mapped WHERE new_status IS DISTINCT FROM old_status),
      upd AS (UPDATE public.%2$I x SET %1$I = c.new_status FROM changed c WHERE x.id = c.id RETURNING 1)
      INSERT INTO public.status_normalisation_log (table_name, record_id, old_status, new_status, reason)
      SELECT %2$L, id, old_status, new_status, 'legacy status wording' FROM changed;
    $f$, t.col, t.tbl);
    EXECUTE sql;
  END LOOP;
END $$;

-- 4. Constraints
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_standard_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_standard_check
  CHECK (status IN ('draft','unpaid','partially_paid','paid','verified','cancelled'));

ALTER TABLE public.grading_payment_submissions DROP CONSTRAINT IF EXISTS grading_submission_status_standard_check;
ALTER TABLE public.grading_payment_submissions ADD CONSTRAINT grading_submission_status_standard_check
  CHECK (status IN ('pending_verification','verified','rejected','cancelled'));

ALTER TABLE public.competition_payment_submissions DROP CONSTRAINT IF EXISTS competition_submission_status_standard_check;
ALTER TABLE public.competition_payment_submissions ADD CONSTRAINT competition_submission_status_standard_check
  CHECK (status IN ('pending_verification','verified','rejected','cancelled'));

ALTER TABLE public.seminar_payment_submissions DROP CONSTRAINT IF EXISTS seminar_submission_status_standard_check;
ALTER TABLE public.seminar_payment_submissions ADD CONSTRAINT seminar_submission_status_standard_check
  CHECK (status IN ('pending_verification','verified','rejected','cancelled'));

ALTER TABLE public.public_chat_payment_submissions DROP CONSTRAINT IF EXISTS chat_submission_status_standard_check;
ALTER TABLE public.public_chat_payment_submissions ADD CONSTRAINT chat_submission_status_standard_check
  CHECK (status IN ('pending_verification','verified','rejected','cancelled'));

ALTER TABLE public.guards_purchases DROP CONSTRAINT IF EXISTS guards_sale_status_standard_check;
ALTER TABLE public.guards_purchases ADD CONSTRAINT guards_sale_status_standard_check
  CHECK (sale_status IN ('pending_verification','verified','rejected','cancelled'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_verification_status_standard_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_verification_status_standard_check
  CHECK (verification_status IS NULL OR verification_status IN ('pending','verified','rejected'));

-- 5. Keep invoices in step with payment verification
CREATE OR REPLACE FUNCTION public.sync_invoice_status_from_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices%ROWTYPE;
  new_status text;
  inv_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
BEGIN
  IF inv_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = inv_id;
  IF NOT FOUND OR inv.status IN ('cancelled','draft') THEN RETURN COALESCE(NEW, OLD); END IF;

  IF COALESCE(inv.balance_due, 0) > 0.01 THEN
    new_status := CASE WHEN COALESCE(inv.amount_paid, 0) > 0 THEN 'partially_paid' ELSE 'unpaid' END;
  ELSIF EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = inv_id)
        AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = inv_id
                        AND COALESCE(p.verification_status, 'pending') <> 'verified') THEN
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

DROP TRIGGER IF EXISTS trg_sync_invoice_status_from_payments ON public.payments;
CREATE TRIGGER trg_sync_invoice_status_from_payments
AFTER INSERT OR UPDATE OF verification_status, amount OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_status_from_payments();
