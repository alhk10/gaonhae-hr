create or replace function public.admin_verify_competition_submission(
  p_id uuid,
  p_verified_by text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.competition_payment_submissions
     set status = 'verified',
         reviewed_by = p_verified_by,
         reviewed_at = now(),
         updated_at = now()
   where id = p_id
     and status = 'pending_verification';
  if not found then
    raise exception 'Competition submission % is not pending verification', p_id;
  end if;
end;
$$;

grant execute on function public.admin_verify_competition_submission(uuid, text) to authenticated;

create or replace function public.admin_verify_seminar_submission(
  p_id uuid,
  p_verified_by text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.seminar_payment_submissions
     set status = 'verified',
         reviewed_by = p_verified_by,
         reviewed_at = now(),
         updated_at = now()
   where id = p_id
     and status = 'pending_verification';
  if not found then
    raise exception 'Seminar submission % is not pending verification', p_id;
  end if;
end;
$$;

grant execute on function public.admin_verify_seminar_submission(uuid, text) to authenticated;