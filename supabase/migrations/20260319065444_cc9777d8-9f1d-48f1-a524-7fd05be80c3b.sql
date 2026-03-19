CREATE OR REPLACE FUNCTION public.generate_payment_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_period text := to_char(now(), 'YYYYMM');
  next_number integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('payment-number-' || current_period));

  SELECT COALESCE(
    MAX(COALESCE(NULLIF(substring(payment_number from '[0-9]+$'), '')::integer, 0)),
    0
  ) + 1
  INTO next_number
  FROM public.payments
  WHERE payment_number LIKE 'PAY-' || current_period || '-%';

  RETURN format('PAY-%s-%s', current_period, lpad(next_number::text, 4, '0'));
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_payment_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_number IS NULL OR btrim(NEW.payment_number) = '' THEN
    NEW.payment_number := public.generate_payment_number();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_payment_number_on_insert ON public.payments;

CREATE TRIGGER set_payment_number_on_insert
BEFORE INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.assign_payment_number();