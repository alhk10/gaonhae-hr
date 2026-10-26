DROP FUNCTION IF EXISTS public.access_attendance_students(text, text, text, date);
CREATE FUNCTION public.access_attendance_students(p_password text, p_branch_id text, p_search text DEFAULT NULL::text, p_date date DEFAULT NULL::date)
 RETURNS TABLE(id uuid, name text, current_belt text, date_of_birth date, status text, remaining integer, pending integer, unlimited boolean, available integer, term_payment text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_from date; v_to date; v_term uuid; v_d date := coalesce(p_date, current_date);
BEGIN
  PERFORM public._access_branch_check(p_password, p_branch_id);
  SELECT t.id, t.start_date, t.end_date INTO v_term, v_from, v_to FROM term_calendars t
   WHERE t.branch_id = p_branch_id AND v_d BETWEEN t.start_date AND t.end_date ORDER BY t.start_date DESC LIMIT 1;
  v_from := coalesce(v_from, v_d); v_to := coalesce(v_to, v_d);
  RETURN QUERY
  SELECT s.id, upper(trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,''))), s.current_belt, s.date_of_birth, s.status,
         b.remaining, b.pending, b.unlimited, b.available,
         CASE WHEN v_term IS NULL THEN NULL ELSE public._term_payment_status(s.id, v_term)::text END
  FROM students s
  CROSS JOIN LATERAL public._lesson_balance(s.id, p_branch_id, v_from, v_to) b
  WHERE s.branch_id = p_branch_id AND s.status IN ('active','trial')
    AND (coalesce(trim(p_search),'') = '' OR (coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')) ILIKE '%'||trim(p_search)||'%'
         OR (coalesce(s.last_name,'')||' '||coalesce(s.first_name,'')) ILIKE '%'||trim(p_search)||'%')
  ORDER BY s.first_name, s.last_name
  LIMIT 30;
END $function$;
GRANT EXECUTE ON FUNCTION public.access_attendance_students(text, text, text, date) TO anon, authenticated;