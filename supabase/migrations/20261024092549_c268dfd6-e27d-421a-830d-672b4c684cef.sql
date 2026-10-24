CREATE OR REPLACE FUNCTION public.normalize_payment_verification_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.verification_status IN ('pending_verification','awaiting_verification','unverified') THEN
    NEW.verification_status := 'pending';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_normalize_payment_verification_status ON public.payments;
CREATE TRIGGER trg_normalize_payment_verification_status
BEFORE INSERT OR UPDATE OF verification_status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.normalize_payment_verification_status();