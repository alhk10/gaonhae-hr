-- Helper: resolve the relevant term for a student via enrollment, else via active entitlements
CREATE OR REPLACE FUNCTION public._resolve_public_student_term(p_student_id uuid)
RETURNS TABLE (term_id uuid, enrollment_id uuid, class_type text, start_date date, end_date date, term_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_branch text;
BEGIN
  SELECT s.branch_id INTO v_branch FROM students s WHERE s.id = p_student_id;
  IF v_branch IS NULL THEN RETURN; END IF;

  -- 1) Active enrollment first (current term, else upcoming, else most recent)
  RETURN QUERY
  SELECT t.id, e.id, e.class_type, t.start_date, t.end_date, t.name
  FROM student_class_enrollments e
  JOIN term_calendars t ON t.id = e.term_id
  WHERE e.student_id = p_student_id
    AND e.status = 'active'
    AND e.branch_id = v_branch
  ORDER BY
    CASE WHEN CURRENT_DATE BETWEEN t.start_date AND t.end_date THEN 0
         WHEN t.start_date > CURRENT_DATE THEN 1
         ELSE 2 END,
    t.start_date ASC
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- 2) Fallback: find a term overlapping any active entitlement window for this branch
  RETURN QUERY
  SELECT t.id, NULL::uuid, NULL::text, t.start_date, t.end_date, t.name
  FROM term_calendars t
  WHERE EXISTS (
    SELECT 1 FROM entitlements ent
    WHERE ent.student_id = p_student_id
      AND ent.is_active = true
      AND (ent.branch_scope IS NULL OR ent.branch_scope = v_branch)
      AND (ent.valid_from IS NULL OR ent.valid_from <= t.end_date)
      AND (ent.valid_to   IS NULL OR ent.valid_to   >= t.start_date)
  )
  ORDER BY
    CASE WHEN CURRENT_DATE BETWEEN t.start_date AND t.end_date THEN 0
         WHEN t.start_date > CURRENT_DATE THEN 1
         ELSE 2 END,
    t.start_date ASC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public._resolve_public_student_term(uuid) TO anon, authenticated;

-- Rewrite term context using resolver + unlimited flag + monthly counts
DROP FUNCTION IF EXISTS public.get_public_student_term_context(uuid, uuid);

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
  country text,
  attended_this_month integer,
  missed_this_month integer,
  is_unlimited boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_student RECORD;
  v_term RECORD;
  v_total integer := 0;
  v_remaining integer := 0;
  v_scopes text[] := ARRAY[]::text[];
  v_active integer := 0;
  v_country text;
  v_month_start date := date_trunc('month', CURRENT_DATE)::date;
  v_month_end date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
  v_attended integer := 0;
  v_missed integer := 0;
  v_unlimited boolean := false;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN
    RETURN;
  END IF;

  SELECT s.id, s.date_of_birth, s.current_belt, s.branch_id
    INTO v_student FROM students s WHERE s.id = p_student_id;
  IF v_student.id IS NULL THEN RETURN; END IF;

  SELECT * INTO v_term FROM public._resolve_public_student_term(p_student_id) LIMIT 1;
  IF v_term.term_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(sessions_total),0), COALESCE(SUM(sessions_remaining),0),
         COALESCE(array_agg(DISTINCT NULLIF(class_type_scope,'')) FILTER (WHERE class_type_scope IS NOT NULL), ARRAY[]::text[])
    INTO v_total, v_remaining, v_scopes
  FROM entitlements
  WHERE student_id = p_student_id
    AND is_active = true
    AND (valid_to IS NULL OR valid_to >= v_term.start_date)
    AND (valid_from IS NULL OR valid_from <= v_term.end_date);

  SELECT EXISTS (
    SELECT 1 FROM entitlements e
    LEFT JOIN products p ON p.id = e.product_id
    WHERE e.student_id = p_student_id
      AND e.is_active = true
      AND (e.valid_to IS NULL OR e.valid_to >= v_term.start_date)
      AND (e.valid_from IS NULL OR e.valid_from <= v_term.end_date)
      AND (p.name ILIKE '%unlimited%' OR e.sessions_total IS NULL)
  ) INTO v_unlimited;

  IF v_term.enrollment_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active
    FROM student_scheduled_classes sc
    WHERE sc.enrollment_id = v_term.enrollment_id
      AND sc.status NOT IN ('cancelled','swapped');
  ELSE
    SELECT COUNT(*) INTO v_active
    FROM student_scheduled_classes sc
    WHERE sc.student_id = p_student_id
      AND sc.scheduled_date BETWEEN v_term.start_date AND v_term.end_date
      AND sc.status NOT IN ('cancelled','swapped');
  END IF;

  SELECT b.country INTO v_country FROM branches b WHERE b.id = v_student.branch_id;

  SELECT
    COUNT(*) FILTER (WHERE lower(coalesce(status,'')) IN ('present','attended')),
    COUNT(*) FILTER (WHERE lower(coalesce(status,'')) IN ('absent','missed','no_show'))
  INTO v_attended, v_missed
  FROM class_attendance ca
  WHERE ca.student_id = p_student_id
    AND ca.class_date BETWEEN v_month_start AND v_month_end;

  RETURN QUERY SELECT
    v_term.term_id,
    v_term.term_name,
    v_term.start_date,
    v_term.end_date,
    v_term.enrollment_id,
    v_term.class_type,
    v_total,
    v_remaining,
    v_active,
    CASE WHEN v_unlimited THEN 999 ELSE GREATEST(0, v_remaining - v_active) END,
    v_scopes,
    DATE_PART('year', AGE(v_student.date_of_birth))::integer,
    v_student.current_belt,
    v_student.branch_id,
    v_country,
    COALESCE(v_attended, 0),
    COALESCE(v_missed, 0),
    COALESCE(v_unlimited, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_term_context(uuid, uuid) TO anon, authenticated;

-- Bookings: use resolver, return empty list (not nothing) if no enrollment
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
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_term RECORD;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;
  SELECT * INTO v_term FROM public._resolve_public_student_term(p_student_id) LIMIT 1;
  IF v_term.term_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT sc.id, sc.scheduled_date, sc.start_time, sc.end_time, sc.timetable_id,
         sc.status, COALESCE(v_term.class_type, NULL)
  FROM student_scheduled_classes sc
  WHERE sc.student_id = p_student_id
    AND sc.scheduled_date BETWEEN v_term.start_date AND v_term.end_date
    AND sc.status NOT IN ('cancelled','swapped');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_term_bookings(uuid, uuid) TO anon, authenticated;

-- Slot capacities: use resolver
CREATE OR REPLACE FUNCTION public.get_public_term_slot_capacities(
  p_session_id uuid,
  p_student_id uuid,
  p_timetable_ids uuid[]
) RETURNS TABLE (
  scheduled_date date,
  timetable_id uuid,
  booked_count integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_term RECORD;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;
  SELECT * INTO v_term FROM public._resolve_public_student_term(p_student_id) LIMIT 1;
  IF v_term.term_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT sc.scheduled_date, sc.timetable_id, COUNT(*)::integer
  FROM student_scheduled_classes sc
  WHERE sc.timetable_id = ANY(p_timetable_ids)
    AND sc.scheduled_date BETWEEN v_term.start_date AND v_term.end_date
    AND sc.status NOT IN ('cancelled','swapped')
  GROUP BY sc.scheduled_date, sc.timetable_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_term_slot_capacities(uuid, uuid, uuid[]) TO anon, authenticated;