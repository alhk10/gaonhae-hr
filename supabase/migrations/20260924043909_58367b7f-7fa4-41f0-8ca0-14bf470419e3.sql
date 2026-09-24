-- Auto-verify payments whose proof scan matches the expected amount
CREATE OR REPLACE FUNCTION public.auto_verify_matched_scan_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.proof_scan_status = 'match'
     AND (OLD.proof_scan_status IS DISTINCT FROM 'match')
     AND NEW.payment_method IS DISTINCT FROM 'cash'
     AND NEW.payment_method IS DISTINCT FROM 'credit'
     AND NEW.proof_of_payment_url IS NOT NULL
     AND NEW.verification_status IS DISTINCT FROM 'rejected'
     AND NEW.is_verified = false
  THEN
    NEW.is_verified := true;
    NEW.verification_status := 'verified';
    NEW.verified_by := 'auto_scan';
    NEW.verified_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_verify_matched_scan ON public.payments;
CREATE TRIGGER trg_auto_verify_matched_scan
BEFORE UPDATE OF proof_scan_status ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.auto_verify_matched_scan_payment();

-- Backfill: verify existing pending non-cash payments with a clean scan match
UPDATE public.payments
SET is_verified = true,
    verification_status = 'verified',
    verified_by = 'auto_scan',
    verified_at = now(),
    updated_at = now()
WHERE proof_scan_status = 'match'
  AND is_verified = false
  AND payment_method <> 'cash'
  AND payment_method <> 'credit'
  AND proof_of_payment_url IS NOT NULL
  AND (verification_status IS NULL OR verification_status = 'pending');