
-- =========================================================
-- Public chat: lesson scheduling RPCs (SECURITY DEFINER)
-- All RPCs validate session.matched_student_id and branch
-- =========================================================

-- Helper: validate that the session belongs to the matched student & branch
CREATE OR REPLACE FUNCTION public._validate_public_chat_session(
  p_session_id uuid,
  p_student_id uuid,
  p_branch_id text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matched uuid;
  v_branch text;
BEGIN
  SELECT matched_student_id, branch_id INTO v_matched, v_branch
  FROM public_chat_sessions WHERE id = p_session_id;
  IF v_matched IS NULL OR v_matched <> p_student_id THEN
    RETURN false;
  END IF;
  IF p_branch_id IS NOT NULL AND v_branch <> p_branch_id THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

-- 1. Term context for the matched student
CREATE OR REPLACE FUNCTION public.get_public_student_term_context(
  p_session_id uuid,
  p_student_id uuid
) RETURNS TABLE (
  term_id uuid,
  term_name text,
  start_date date,
  end_date date,
  enrollment_id uuid,
  class_type text,
  sessions_total integer,
  sessions_remaining integer,
  active_scheduled_count integer,
  unbooked_count integer,
  class_type_scopes text[],
  age integer,
  current_belt text,
  branch_id text,
  country text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enr RECORD;
  v_student RECORD;
  v_term RECORD;
  v_total integer := 0;
  v_remaining integer := 0;
  v_scopes text[] := ARRAY[]::text[];
  v_active integer := 0;
  v_country text;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN
    RETURN;
  END IF;

  SELECT s.id, s.date_of_birth, s.current_belt, s.branch_id
    INTO v_student FROM students s WHERE s.id = p_student_id;
  IF v_student.id IS NULL THEN RETURN; END IF;

  -- Prefer enrollment whose term contains today, else next upcoming
  SELECT e.* INTO v_enr
  FROM student_class_enrollments e
  JOIN term_calendars t ON t.id = e.term_id
  WHERE e.student_id = p_student_id
    AND e.status = 'active'
    AND e.branch_id = v_student.branch_id
  ORDER BY
    CASE WHEN CURRENT_DATE BETWEEN t.start_date AND t.end_date THEN 0
         WHEN t.start_date > CURRENT_DATE THEN 1
         ELSE 2 END,
    t.start_date ASC
  LIMIT 1;

  IF v_enr.id IS NULL THEN RETURN; END IF;

  SELECT t.* INTO v_term FROM term_calendars t WHERE t.id = v_enr.term_id;

  SELECT COALESCE(SUM(sessions_total),0), COALESCE(SUM(sessions_remaining),0),
         COALESCE(array_agg(DISTINCT NULLIF(class_type_scope,'')) FILTER (WHERE class_type_scope IS NOT NULL), ARRAY[]::text[])
    INTO v_total, v_remaining, v_scopes
  FROM entitlements
  WHERE student_id = p_student_id
    AND is_active = true
    AND (valid_to IS NULL OR valid_to >= v_term.start_date)
    AND (valid_from IS NULL OR valid_from <= v_term.end_date);

  SELECT COUNT(*) INTO v_active
  FROM student_scheduled_classes sc
  WHERE sc.enrollment_id = v_enr.id
    AND sc.status NOT IN ('cancelled','swapped');

  SELECT b.country INTO v_country FROM branches b WHERE b.id = v_student.branch_id;

  RETURN QUERY SELECT
    v_term.id,
    v_term.name,
    v_term.start_date,
    v_term.end_date,
    v_enr.id,
    v_enr.class_type,
    v_total,
    v_remaining,
    v_active,
    GREATEST(0, v_remaining - v_active),
    v_scopes,
    DATE_PART('year', AGE(v_student.date_of_birth))::integer,
    v_student.current_belt,
    v_student.branch_id,
    v_country;
END;
$$;

-- 2. Branch timetable slots eligible for this student
CREATE OR REPLACE FUNCTION public.get_public_branch_timetable_slots(
  p_session_id uuid,
  p_student_id uuid
) RETURNS TABLE (
  id uuid,
  weekday integer,
  start_time time,
  end_time time,
  class_type text,
  max_capacity integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
  v_age integer;
  v_scopes text[];
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;

  SELECT s.date_of_birth, s.current_belt, s.branch_id INTO v_student
  FROM students s WHERE s.id = p_student_id;
  IF v_student IS NULL THEN RETURN; END IF;
  v_age := DATE_PART('year', AGE(v_student.date_of_birth))::integer;

  SELECT COALESCE(array_agg(DISTINCT NULLIF(class_type_scope,'')) FILTER (WHERE class_type_scope IS NOT NULL), ARRAY[]::text[])
    INTO v_scopes
  FROM entitlements
  WHERE student_id = p_student_id AND is_active = true;

  RETURN QUERY
  SELECT t.id, t.weekday, t.start_time, t.end_time, t.class_type, COALESCE(t.max_capacity, 999)
  FROM branch_timetables t
  WHERE t.branch_id = v_student.branch_id
    AND t.is_active = true
    AND (t.age_from IS NULL OR v_age >= t.age_from)
    AND (t.age_to IS NULL OR v_age <= t.age_to)
    AND (t.belt_levels IS NULL OR array_length(t.belt_levels,1) IS NULL
         OR v_student.current_belt IS NULL
         OR v_student.current_belt = ANY(t.belt_levels))
    AND (array_length(v_scopes,1) IS NULL
         OR t.class_type = ANY(
           SELECT trim(unnest(string_to_array(s, ',')))
           FROM unnest(v_scopes) AS s
         ));
END;
$$;

-- 3. Student's scheduled classes for the active term
CREATE OR REPLACE FUNCTION public.get_public_student_term_bookings(
  p_session_id uuid,
  p_student_id uuid
) RETURNS TABLE (
  id uuid,
  scheduled_date date,
  start_time time,
  end_time time,
  timetable_id uuid,
  status text,
  class_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enr_id uuid;
  v_start date;
  v_end date;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;

  SELECT e.id, t.start_date, t.end_date INTO v_enr_id, v_start, v_end
  FROM student_class_enrollments e
  JOIN term_calendars t ON t.id = e.term_id
  JOIN students s ON s.id = e.student_id
  WHERE e.student_id = p_student_id
    AND e.status = 'active'
    AND e.branch_id = s.branch_id
  ORDER BY
    CASE WHEN CURRENT_DATE BETWEEN t.start_date AND t.end_date THEN 0
         WHEN t.start_date > CURRENT_DATE THEN 1 ELSE 2 END,
    t.start_date ASC
  LIMIT 1;

  IF v_enr_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT sc.id, sc.scheduled_date, sc.start_time, sc.end_time, sc.timetable_id,
         sc.status, e.class_type
  FROM student_scheduled_classes sc
  JOIN student_class_enrollments e ON e.id = sc.enrollment_id
  WHERE sc.enrollment_id = v_enr_id
    AND sc.scheduled_date BETWEEN v_start AND v_end
    AND sc.status NOT IN ('cancelled','swapped');
END;
$$;

-- 4. Slot capacities for the term across given timetables
CREATE OR REPLACE FUNCTION public.get_public_term_slot_capacities(
  p_session_id uuid,
  p_student_id uuid,
  p_timetable_ids uuid[]
) RETURNS TABLE (
  scheduled_date date,
  timetable_id uuid,
  booked_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_branch text;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;

  SELECT t.start_date, t.end_date, s.branch_id INTO v_start, v_end, v_branch
  FROM student_class_enrollments e
  JOIN term_calendars t ON t.id = e.term_id
  JOIN students s ON s.id = e.student_id
  WHERE e.student_id = p_student_id AND e.status='active' AND e.branch_id = s.branch_id
  ORDER BY
    CASE WHEN CURRENT_DATE BETWEEN t.start_date AND t.end_date THEN 0
         WHEN t.start_date > CURRENT_DATE THEN 1 ELSE 2 END,
    t.start_date ASC
  LIMIT 1;

  IF v_start IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT sc.scheduled_date, sc.timetable_id, COUNT(*)::integer
  FROM student_scheduled_classes sc
  WHERE sc.timetable_id = ANY(p_timetable_ids)
    AND sc.scheduled_date BETWEEN v_start AND v_end
    AND sc.status NOT IN ('cancelled','swapped')
  GROUP BY sc.scheduled_date, sc.timetable_id;
END;
$$;

-- 5. Public holidays for the student's branch country in a range
CREATE OR REPLACE FUNCTION public.get_public_branch_holidays(
  p_session_id uuid,
  p_student_id uuid,
  p_from date,
  p_to date
) RETURNS TABLE (
  holiday_date date,
  name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country text;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;

  SELECT b.country INTO v_country
  FROM students s JOIN branches b ON b.id = s.branch_id
  WHERE s.id = p_student_id;

  RETURN QUERY
  SELECT h.date, h.name
  FROM public_holidays h
  WHERE (v_country IS NULL OR h.country = v_country OR h.country IS NULL)
    AND h.date BETWEEN p_from AND p_to;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_term_context(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_branch_timetable_slots(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_student_term_bookings(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_term_slot_capacities(uuid, uuid, uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_branch_holidays(uuid, uuid, date, date) TO anon, authenticated;
