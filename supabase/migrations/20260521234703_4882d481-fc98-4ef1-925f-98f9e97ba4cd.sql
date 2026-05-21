
-- 1) List all terms the student has active entitlements for (current + future)
CREATE OR REPLACE FUNCTION public.get_public_student_invoiced_terms(
  p_session_id uuid,
  p_student_id uuid
) RETURNS TABLE (
  term_id uuid,
  term_name text,
  start_date date,
  end_date date,
  is_current boolean,
  is_unlimited boolean,
  sessions_total integer,
  sessions_remaining integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_branch text;
  v_current_term_id uuid;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;

  SELECT s.branch_id INTO v_branch FROM students s WHERE s.id = p_student_id;
  IF v_branch IS NULL THEN RETURN; END IF;

  -- candidate terms = any term in branch overlapping any active entitlement window
  -- restrict to current/future (end_date >= today)
  CREATE TEMP TABLE _tmp_terms ON COMMIT DROP AS
  SELECT DISTINCT t.id AS term_id, t.name AS term_name, t.start_date, t.end_date
  FROM term_calendars t
  WHERE t.branch_id = v_branch
    AND t.end_date >= CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM entitlements ent
      WHERE ent.student_id = p_student_id
        AND ent.is_active = true
        AND (ent.branch_scope IS NULL OR ent.branch_scope = v_branch)
        AND (ent.valid_from IS NULL OR ent.valid_from <= t.end_date)
        AND (ent.valid_to   IS NULL OR ent.valid_to   >= t.start_date)
    );

  -- pick "current" = term containing today, else earliest upcoming
  SELECT tt.term_id INTO v_current_term_id
  FROM _tmp_terms tt
  ORDER BY
    CASE WHEN CURRENT_DATE BETWEEN tt.start_date AND tt.end_date THEN 0 ELSE 1 END,
    tt.start_date ASC
  LIMIT 1;

  RETURN QUERY
  SELECT
    tt.term_id,
    tt.term_name,
    tt.start_date,
    tt.end_date,
    (tt.term_id = v_current_term_id) AS is_current,
    EXISTS (
      SELECT 1 FROM entitlements ent
      LEFT JOIN products p ON p.id = ent.product_id
      WHERE ent.student_id = p_student_id
        AND ent.is_active = true
        AND (ent.valid_to IS NULL OR ent.valid_to >= tt.start_date)
        AND (ent.valid_from IS NULL OR ent.valid_from <= tt.end_date)
        AND (p.name ILIKE '%unlimited%' OR ent.sessions_total IS NULL)
    ) AS is_unlimited,
    COALESCE((
      SELECT SUM(ent.sessions_total)::integer FROM entitlements ent
      WHERE ent.student_id = p_student_id AND ent.is_active = true
        AND (ent.valid_to IS NULL OR ent.valid_to >= tt.start_date)
        AND (ent.valid_from IS NULL OR ent.valid_from <= tt.end_date)
    ), 0) AS sessions_total,
    COALESCE((
      SELECT SUM(ent.sessions_remaining)::integer FROM entitlements ent
      WHERE ent.student_id = p_student_id AND ent.is_active = true
        AND (ent.valid_to IS NULL OR ent.valid_to >= tt.start_date)
        AND (ent.valid_from IS NULL OR ent.valid_from <= tt.end_date)
    ), 0) AS sessions_remaining
  FROM _tmp_terms tt
  ORDER BY tt.start_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_invoiced_terms(uuid, uuid) TO anon, authenticated;

-- 2) Term context overload that accepts an explicit term_id
CREATE OR REPLACE FUNCTION public.get_public_student_term_context(
  p_session_id uuid,
  p_student_id uuid,
  p_term_id uuid
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
  v_enrollment_id uuid;
  v_class_type text;
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

  IF p_term_id IS NULL THEN
    SELECT r.term_id, r.term_name, r.start_date, r.end_date, r.enrollment_id, r.class_type
      INTO v_term FROM public._resolve_public_student_term(p_student_id) r LIMIT 1;
  ELSE
    SELECT t.id AS term_id, t.name AS term_name, t.start_date, t.end_date
      INTO v_term FROM term_calendars t WHERE t.id = p_term_id AND t.branch_id = v_student.branch_id;
    IF v_term.term_id IS NOT NULL THEN
      SELECT e.id, e.class_type INTO v_enrollment_id, v_class_type
        FROM student_class_enrollments e
        WHERE e.student_id = p_student_id AND e.term_id = p_term_id AND e.status = 'active'
        LIMIT 1;
    END IF;
  END IF;

  IF v_term.term_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(ent.sessions_total),0),
         COALESCE(SUM(ent.sessions_remaining),0),
         COALESCE(array_agg(DISTINCT NULLIF(ent.class_type_scope,'')) FILTER (WHERE ent.class_type_scope IS NOT NULL), ARRAY[]::text[])
    INTO v_total, v_remaining, v_scopes
  FROM entitlements ent
  WHERE ent.student_id = p_student_id
    AND ent.is_active = true
    AND (ent.valid_to IS NULL OR ent.valid_to >= v_term.start_date)
    AND (ent.valid_from IS NULL OR ent.valid_from <= v_term.end_date);

  SELECT EXISTS (
    SELECT 1 FROM entitlements ent
    LEFT JOIN products p ON p.id = ent.product_id
    WHERE ent.student_id = p_student_id
      AND ent.is_active = true
      AND (ent.valid_to IS NULL OR ent.valid_to >= v_term.start_date)
      AND (ent.valid_from IS NULL OR ent.valid_from <= v_term.end_date)
      AND (p.name ILIKE '%unlimited%' OR ent.sessions_total IS NULL)
  ) INTO v_unlimited;

  IF p_term_id IS NULL THEN
    v_enrollment_id := v_term.enrollment_id;
    v_class_type := v_term.class_type;
  END IF;

  IF v_enrollment_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active
    FROM student_scheduled_classes sc
    WHERE sc.enrollment_id = v_enrollment_id
      AND sc.status NOT IN ('cancelled','swapped');
  ELSE
    SELECT COUNT(*) INTO v_active
    FROM student_scheduled_classes sc
    JOIN student_class_enrollments e ON e.id = sc.enrollment_id
    WHERE e.student_id = p_student_id
      AND sc.scheduled_date BETWEEN v_term.start_date AND v_term.end_date
      AND sc.status NOT IN ('cancelled','swapped');
  END IF;

  SELECT b.country INTO v_country FROM branches b WHERE b.id = v_student.branch_id;

  SELECT
    COUNT(*) FILTER (WHERE lower(coalesce(ca.status,'')) IN ('present','attended')),
    COUNT(*) FILTER (WHERE lower(coalesce(ca.status,'')) IN ('absent','missed','no_show'))
  INTO v_attended, v_missed
  FROM class_attendance ca
  WHERE ca.student_id = p_student_id
    AND ca.class_date BETWEEN v_month_start AND v_month_end;

  RETURN QUERY SELECT
    v_term.term_id, v_term.term_name, v_term.start_date, v_term.end_date,
    v_enrollment_id, v_class_type,
    v_total, v_remaining, v_active,
    CASE WHEN v_unlimited THEN 999 ELSE GREATEST(0, v_remaining - v_active) END,
    v_scopes,
    DATE_PART('year', AGE(v_student.date_of_birth))::integer,
    v_student.current_belt, v_student.branch_id, v_country,
    COALESCE(v_attended, 0), COALESCE(v_missed, 0), COALESCE(v_unlimited, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_term_context(uuid, uuid, uuid) TO anon, authenticated;

-- 3) Bookings overload
CREATE OR REPLACE FUNCTION public.get_public_student_term_bookings(
  p_session_id uuid,
  p_student_id uuid,
  p_term_id uuid
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
    AND sc.status NOT IN ('cancelled','swapped');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_term_bookings(uuid, uuid, uuid) TO anon, authenticated;

-- 4) Slot capacities overload
CREATE OR REPLACE FUNCTION public.get_public_term_slot_capacities(
  p_session_id uuid,
  p_student_id uuid,
  p_timetable_ids uuid[],
  p_term_id uuid
) RETURNS TABLE (scheduled_date date, timetable_id uuid, booked_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_branch text;
  v_term RECORD;
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;
  SELECT s.branch_id INTO v_branch FROM students s WHERE s.id = p_student_id;

  IF p_term_id IS NULL THEN
    SELECT r.term_id, r.start_date, r.end_date
      INTO v_term FROM public._resolve_public_student_term(p_student_id) r LIMIT 1;
  ELSE
    SELECT t.id AS term_id, t.start_date, t.end_date
      INTO v_term FROM term_calendars t WHERE t.id = p_term_id AND t.branch_id = v_branch;
  END IF;

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

GRANT EXECUTE ON FUNCTION public.get_public_term_slot_capacities(uuid, uuid, uuid[], uuid) TO anon, authenticated;
