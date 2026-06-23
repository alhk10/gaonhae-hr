CREATE OR REPLACE FUNCTION public.admin_verify_competition_submission(p_id uuid, p_verified_by text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_belt text;
  v_urls text[];
  v_require boolean;
  v_status text;
begin
  select cps.current_belt, cps.grading_card_urls, coalesce(ev.require_grading_card,false), cps.status
    into v_belt, v_urls, v_require, v_status
    from public.competition_payment_submissions cps
    left join public.competition_events ev on ev.id = cps.event_id
   where cps.id = p_id;

  if not found then
    raise exception 'Competition submission % not found', p_id;
  end if;

  if v_status <> 'pending_verification' then
    raise exception 'Competition submission % is not pending verification', p_id;
  end if;

  if v_require
     and v_belt in ('Foundation 1','Foundation 2','Foundation 3','Foundation','White','Yellow Tip','Yellow','Green Tip','Green','Blue Tip','Blue','Red Tip','Red','Black Tip')
     and coalesce(array_length(v_urls,1),0) = 0 then
    raise exception 'Grading card upload is required before verification';
  end if;

  update public.competition_payment_submissions
     set status = 'verified',
         reviewed_by = p_verified_by,
         reviewed_at = now(),
         updated_at = now()
   where id = p_id;
end;
$function$;