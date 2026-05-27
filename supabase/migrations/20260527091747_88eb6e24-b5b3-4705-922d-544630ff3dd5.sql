create or replace function public.admin_grading_row_delete_context(p_source text, p_id uuid)
returns table(student_matched boolean, student_name text, invoice_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid;
  v_invoice_id uuid;
  v_invoice_item_id uuid;
begin
  if p_source = 'registration' then
    select gr.student_id, gr.invoice_item_id
      into v_student_id, v_invoice_item_id
    from public.grading_registrations gr where gr.id = p_id;
    if v_invoice_item_id is not null then
      select ii.invoice_id into v_invoice_id from public.invoice_items ii where ii.id = v_invoice_item_id;
    end if;
  elsif p_source = 'submission' then
    select gps.matched_student_id, gps.matched_invoice_id
      into v_student_id, v_invoice_id
    from public.grading_payment_submissions gps where gps.id = p_id;
  end if;

  student_matched := v_student_id is not null;
  if v_student_id is not null then
    select coalesce(s.first_name || ' ' || s.last_name, '')
      into student_name from public.students s where s.id = v_student_id;
  end if;
  if v_invoice_id is not null then
    select i.invoice_number into invoice_number from public.invoices i where i.id = v_invoice_id;
  end if;
  return next;
end; $$;
grant execute on function public.admin_grading_row_delete_context(text, uuid) to anon, authenticated;

create or replace function public.admin_competition_submission_delete_context(p_id uuid)
returns table(student_matched boolean, student_name text, invoice_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid;
  v_invoice_id uuid;
begin
  select cps.matched_student_id, cps.matched_invoice_id
    into v_student_id, v_invoice_id
  from public.competition_payment_submissions cps where cps.id = p_id;
  student_matched := v_student_id is not null;
  if v_student_id is not null then
    select coalesce(s.first_name || ' ' || s.last_name, '')
      into student_name from public.students s where s.id = v_student_id;
  end if;
  if v_invoice_id is not null then
    select i.invoice_number into invoice_number from public.invoices i where i.id = v_invoice_id;
  end if;
  return next;
end; $$;
grant execute on function public.admin_competition_submission_delete_context(uuid) to anon, authenticated;

create or replace function public.admin_guards_purchase_delete_context(p_id uuid)
returns table(student_matched boolean, student_name text, invoice_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid;
  v_invoice_id uuid;
begin
  select gp.matched_student_id, gp.invoice_id
    into v_student_id, v_invoice_id
  from public.guards_purchases gp where gp.id = p_id;
  student_matched := v_student_id is not null;
  if v_student_id is not null then
    select coalesce(s.first_name || ' ' || s.last_name, '')
      into student_name from public.students s where s.id = v_student_id;
  end if;
  if v_invoice_id is not null then
    select i.invoice_number into invoice_number from public.invoices i where i.id = v_invoice_id;
  end if;
  return next;
end; $$;
grant execute on function public.admin_guards_purchase_delete_context(uuid) to anon, authenticated;