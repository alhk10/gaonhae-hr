DO $$
DECLARE r record; v text;
BEGIN
  FOR r IN SELECT oid FROM pg_proc WHERE proname IN ('access_record_payment','record_external_invoice_payment') LOOP
    v := pg_get_functiondef(r.oid);
    v := replace(v, 'v_cash boolean := p_method=''cash'';', 'v_cash boolean := (p_method=''cash'' OR _access_scope(p_password)=''*'');');
    EXECUTE v;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public._payments_superadmin_autoverify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND coalesce(NEW.verification_status,'pending') = 'pending'
     AND public.is_superadmin(auth.jwt()->>'email') THEN
    NEW.verification_status := 'verified';
    NEW.is_verified := true;
    NEW.verified_by := coalesce(NEW.verified_by, auth.jwt()->>'email');
    NEW.verified_at := coalesce(NEW.verified_at, now());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payments_superadmin_autoverify ON public.payments;
CREATE TRIGGER trg_payments_superadmin_autoverify BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public._payments_superadmin_autoverify();