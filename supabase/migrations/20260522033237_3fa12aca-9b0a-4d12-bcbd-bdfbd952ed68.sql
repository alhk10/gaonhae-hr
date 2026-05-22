CREATE OR REPLACE FUNCTION public.get_public_student_term_bookings(p_session_id uuid, p_student_id uuid)
 RETURNS TABLE(id uuid, scheduled_date date, start_time time without time zone, end_time time without time zone, timetable_id uuid, status text, class_type text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_term RECORD;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;
  SELECT * INTO v_term FROM public._resolve_public_student_term(p_student_id) LIMIT 1;
  IF v_term.term_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT sc.id, sc.scheduled_date, sc.start_time, sc.end_time, sc.timetable_id,
         sc.status, COALESCE(e.class_type, v_term.class_type)
  FROM student_scheduled_classes sc
  JOIN student_class_enrollments e ON e.id = sc.enrollment_id
  WHERE e.student_id = p_student_id
    AND sc.scheduled_date BETWEEN v_term.start_date AND v_term.end_date
    AND sc.status NOT IN ('cancelled','swapped')
  UNION ALL
  SELECT ca.id, ca.class_date, ct.start_time, ct.end_time, ca.timetable_id,
         'attended'::text, COALESCE(ct.class_type, v_term.class_type)
  FROM class_attendance ca
  JOIN class_timetables ct ON ct.id = ca.timetable_id
  WHERE ca.student_id = p_student_id
    AND ca.class_date BETWEEN v_term.start_date AND v_term.end_date
    AND ca.status IN ('present','late')
    AND NOT EXISTS (
      SELECT 1 FROM student_scheduled_classes sc2
      JOIN student_class_enrollments e2 ON e2.id = sc2.enrollment_id
      WHERE e2.student_id = p_student_id
        AND sc2.scheduled_date = ca.class_date
        AND sc2.timetable_id = ca.timetable_id
        AND sc2.status NOT IN ('cancelled','swapped')
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_student_term_bookings(p_session_id uuid, p_student_id uuid, p_term_id uuid)
 RETURNS TABLE(id uuid, scheduled_date date, start_time time without time zone, end_time time without time zone, timetable_id uuid, status text, class_type text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_branch text;
  v_term RECORD;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;
  SELECT s.branch_id INTO v_branch FROM students s WHERE s.id = p_student_id;

  IF p_term_id IS NULL THEN
    SELECT r.term_id, r.start_date, r.end_date, r.class_type
      INTO v_term FROM public._resolve_public_student_term(p_student_id) r LIMIT 1;
  ELSE
    SELECT t.id AS term_id, t.start_date, t.end_date, NULL::text AS class_type
      INTO v_term FROM term_calendars t WHERE t.id = p_term_id AND t.branch_id = v_branch;
  END IF;

  IF v_term.term_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT sc.id, sc.scheduled_date, sc.start_time, sc.end_time, sc.timetable_id,
         sc.status, COALESCE(e.class_type, v_term.class_type)
  FROM student_scheduled_classes sc
  JOIN student_class_enrollments e ON e.id = sc.enrollment_id
  WHERE e.student_id = p_student_id
    AND sc.scheduled_date BETWEEN v_term.start_date AND v_term.end_date
    AND sc.status NOT IN ('cancelled','swapped')
  UNION ALL
  SELECT ca.id, ca.class_date, ct.start_time, ct.end_time, ca.timetable_id,
         'attended'::text, COALESCE(ct.class_type, v_term.class_type)
  FROM class_attendance ca
  JOIN class_timetables ct ON ct.id = ca.timetable_id
  WHERE ca.student_id = p_student_id
    AND ca.class_date BETWEEN v_term.start_date AND v_term.end_date
    AND ca.status IN ('present','late')
    AND NOT EXISTS (
      SELECT 1 FROM student_scheduled_classes sc2
      JOIN student_class_enrollments e2 ON e2.id = sc2.enrollment_id
      WHERE e2.student_id = p_student_id
        AND sc2.scheduled_date = ca.class_date
        AND sc2.timetable_id = ca.timetable_id
        AND sc2.status NOT IN ('cancelled','swapped')
    );
END;
$function$;