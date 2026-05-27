create or replace function public.admin_delete_grading_registration(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.grading_registrations where id = p_id;
end; $$;
grant execute on function public.admin_delete_grading_registration(uuid) to anon, authenticated;

create or replace function public.admin_delete_competition_submission(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.competition_payment_submissions where id = p_id;
end; $$;
grant execute on function public.admin_delete_competition_submission(uuid) to anon, authenticated;

create or replace function public.admin_delete_guards_purchase(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.guards_purchases where id = p_id;
end; $$;
grant execute on function public.admin_delete_guards_purchase(uuid) to anon, authenticated;