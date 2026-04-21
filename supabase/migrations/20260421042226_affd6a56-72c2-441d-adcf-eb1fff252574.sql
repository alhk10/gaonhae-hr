DROP FUNCTION IF EXISTS public.get_page_access_for_auth(text);

CREATE OR REPLACE FUNCTION public.get_page_access_for_auth(p_employee_id text)
 RETURNS TABLE(profile boolean, apply_leave boolean, submit_claim boolean, payslips boolean, my_attendance boolean, slot_booking_employee boolean, cctv_monitoring boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT profile, apply_leave, submit_claim, payslips, my_attendance, slot_booking_employee, cctv_monitoring
  FROM public.employee_page_access
  WHERE employee_id = p_employee_id
  LIMIT 1;
$function$;