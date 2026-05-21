-- Expand match_student_by_identity with optional gender/email/phone matching
DROP FUNCTION IF EXISTS public.match_student_by_identity(text,text,date,text);

CREATE OR REPLACE FUNCTION public.match_student_by_identity(
  p_first_name text,
  p_last_name text,
  p_dob date,
  p_branch_id text,
  p_gender text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
) RETURNS TABLE(id uuid, first_name text, last_name text, current_belt text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH norm AS (
    SELECT
      NULLIF(regexp_replace(COALESCE(p_phone,''), '\D', '', 'g'), '') AS phone_digits,
      NULLIF(lower(trim(COALESCE(p_email,''))), '') AS email_norm,
      NULLIF(lower(trim(COALESCE(p_gender,''))), '') AS gender_norm
  )
  SELECT s.id, s.first_name, s.last_name, s.current_belt, s.status
  FROM public.students s, norm
  WHERE upper(trim(s.first_name)) = upper(trim(p_first_name))
    AND upper(trim(s.last_name))  = upper(trim(p_last_name))
    AND s.date_of_birth = p_dob
    AND s.branch_id = p_branch_id
    AND (
      -- No extra signals given: behave as before
      (norm.gender_norm IS NULL AND norm.email_norm IS NULL AND norm.phone_digits IS NULL)
      OR
      -- At least one provided signal must match
      (norm.gender_norm IS NOT NULL AND lower(trim(s.gender)) = norm.gender_norm)
      OR
      (norm.email_norm IS NOT NULL AND lower(trim(s.email)) = norm.email_norm)
      OR
      (
        norm.phone_digits IS NOT NULL AND (
          right(regexp_replace(COALESCE(s.phone,''), '\D', '', 'g'), 8) = right(norm.phone_digits, 8)
          OR right(regexp_replace(COALESCE(s.emergency_contact_phone,''), '\D', '', 'g'), 8) = right(norm.phone_digits, 8)
          OR right(regexp_replace(COALESCE(s.emergency_contact_2_phone,''), '\D', '', 'g'), 8) = right(norm.phone_digits, 8)
        )
      )
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.match_student_by_identity(text,text,date,text,text,text,text) TO anon, authenticated;

-- Expand get_public_student_term_context with monthly attended/missed + unlimited flag
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

  -- Unlimited: any active entitlement tied to a product whose name contains 'unlimited'
  SELECT EXISTS (
    SELECT 1 FROM entitlements e
    LEFT JOIN products p ON p.id = e.product_id
    WHERE e.student_id = p_student_id
      AND e.is_active = true
      AND (e.valid_to IS NULL OR e.valid_to >= v_term.start_date)
      AND (e.valid_from IS NULL OR e.valid_from <= v_term.end_date)
      AND (e.sessions_total IS NULL OR p.name ILIKE '%unlimited%')
  ) INTO v_unlimited;

  SELECT COUNT(*) INTO v_active
  FROM student_scheduled_classes sc
  WHERE sc.enrollment_id = v_enr.id
    AND sc.status NOT IN ('cancelled','swapped');

  SELECT b.country INTO v_country FROM branches b WHERE b.id = v_student.branch_id;

  -- Monthly attendance counts (current calendar month)
  SELECT
    COUNT(*) FILTER (WHERE lower(coalesce(status,'')) IN ('present','attended')),
    COUNT(*) FILTER (WHERE lower(coalesce(status,'')) IN ('absent','missed','no_show'))
  INTO v_attended, v_missed
  FROM class_attendance ca
  WHERE ca.student_id = p_student_id
    AND ca.class_date BETWEEN v_month_start AND v_month_end;

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
    v_country,
    COALESCE(v_attended, 0),
    COALESCE(v_missed, 0),
    COALESCE(v_unlimited, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_term_context(uuid, uuid) TO anon, authenticated;