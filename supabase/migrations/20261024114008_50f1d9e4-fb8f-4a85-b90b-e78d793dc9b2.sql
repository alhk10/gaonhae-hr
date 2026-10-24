CREATE OR REPLACE FUNCTION public.admin_verify_competition_submission(p_id uuid, p_verified_by text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_status text;
begin
  select status into v_status from public.competition_payment_submissions where id = p_id;
  if not found then raise exception 'Competition submission % not found', p_id; end if;
  if v_status <> 'pending_verification' then
    raise exception 'Competition submission % is not pending verification', p_id;
  end if;
  update public.competition_payment_submissions
     set status = 'verified', reviewed_by = p_verified_by, reviewed_at = now(), updated_at = now()
   where id = p_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public._auto_verify_scanned_submission()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_amount numeric;
BEGIN
  IF NEW.proof_scan_status IS DISTINCT FROM 'match' OR NEW.proof_scan_amount IS NULL
     OR NEW.matched_student_id IS NULL
     OR lower(COALESCE(NEW.payment_method, '')) IN ('cash', 'credit') THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'guards_purchases' THEN
    IF COALESCE(NEW.sale_status, '') <> 'pending_verification' OR NEW.proof_url IS NULL THEN RETURN NEW; END IF;
    v_amount := NEW.total;
  ELSE
    IF COALESCE(NEW.status, '') <> 'pending_verification' THEN RETURN NEW; END IF;
    v_amount := NEW.amount;
  END IF;
  IF v_amount IS NULL OR round(NEW.proof_scan_amount * 100) <> round(v_amount * 100) THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'guards_purchases' THEN
    NEW.sale_status := 'verified';
  ELSE
    NEW.status := 'verified';
    NEW.reviewed_by := 'auto_scan';
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$function$;