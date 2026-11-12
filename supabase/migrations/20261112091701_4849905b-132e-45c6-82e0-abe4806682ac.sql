CREATE OR REPLACE FUNCTION public._fee_plan_label() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.metadata->>'payment_plan' = 'four_weeks' AND coalesce(NEW.description,'') NOT ILIKE '%(4 weeks)%' THEN
    NEW.description := coalesce(NEW.description,'') || ' (4 weeks)';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public._fee_plan_label() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_fee_plan_label ON public.invoice_items;
CREATE TRIGGER trg_fee_plan_label BEFORE INSERT OR UPDATE OF description, metadata ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public._fee_plan_label();