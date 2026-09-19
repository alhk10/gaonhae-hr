-- Public student directory for /access Students tab
CREATE OR REPLACE FUNCTION public.get_public_student_directory(
  p_search text DEFAULT NULL,
  p_branch_id text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  student_number text,
  name text,
  first_name text,
  last_name text,
  current_belt text,
  branch_id text,
  branch_name text,
  status text,
  email text,
  phone text,
  date_of_birth date,
  term_name text,
  class_type text,
  tier_name text,
  enrolled_weekdays text[],
  invoice_status text,
  invoice_total numeric,
  invoice_balance numeric,
  credit_balance numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_terms AS (
    SELECT DISTINCT ON (t.branch_id) t.id, t.branch_id, t.name
    FROM term_calendars t
    WHERE t.is_active
    ORDER BY t.branch_id, t.start_date DESC
  ),
  enrol AS (
    SELECT DISTINCT ON (e.student_id)
      e.student_id, e.class_type, e.tier_name, e.enrolled_weekdays, ct.name AS term_name
    FROM student_class_enrollments e
    JOIN current_terms ct ON ct.id = e.term_id
    WHERE lower(coalesce(e.status,'')) IN ('active')
    ORDER BY e.student_id, e.created_at DESC
  ),
  inv AS (
    SELECT DISTINCT ON (i.student_id)
      i.student_id, i.status, i.total_amount, i.balance_due
    FROM invoices i
    JOIN current_terms ct ON ct.branch_id = i.branch_id
    WHERE lower(coalesce(i.status,'')) NOT IN ('cancelled')
      AND i.issue_date <= now()::date
    ORDER BY i.student_id, i.issue_date DESC NULLS LAST, i.created_at DESC
  ),
  credits AS (
    SELECT c.student_id, COALESCE(SUM(c.amount),0) AS balance
    FROM student_credits c
    GROUP BY c.student_id
  )
  SELECT
    s.id,
    s.student_number,
    UPPER(TRIM(concat_ws(' ', coalesce(s.display_name,''), NULLIF(concat_ws(' ', s.first_name, s.last_name), ''))))::text AS name,
    s.first_name,
    s.last_name,
    s.current_belt,
    s.branch_id,
    b.name AS branch_name,
    lower(s.status) AS status,
    s.email,
    s.phone,
    s.date_of_birth,
    e.term_name,
    e.class_type,
    e.tier_name,
    e.enrolled_weekdays,
    i.status AS invoice_status,
    i.total_amount AS invoice_total,
    i.balance_due AS invoice_balance,
    COALESCE(cr.balance, 0) AS credit_balance
  FROM students s
  LEFT JOIN branches b ON b.id = s.branch_id
  LEFT JOIN enrol e ON e.student_id = s.id
  LEFT JOIN inv i ON i.student_id = s.id
  LEFT JOIN credits cr ON cr.student_id = s.id
  WHERE (p_branch_id IS NULL OR s.branch_id = p_branch_id)
    AND (p_status IS NULL OR lower(s.status) = lower(p_status))
    AND (
      p_search IS NULL OR btrim(p_search) = '' OR
      concat_ws(' ', s.first_name, s.last_name) ILIKE '%' || btrim(p_search) || '%' OR
      concat_ws(' ', s.last_name, s.first_name) ILIKE '%' || btrim(p_search) || '%' OR
      coalesce(s.display_name,'') ILIKE '%' || btrim(p_search) || '%' OR
      coalesce(s.email,'') ILIKE '%' || btrim(p_search) || '%'
    )
  ORDER BY lower(s.status) = 'active' DESC, s.first_name, s.last_name
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_directory(text, text, text) TO anon, authenticated, service_role;

-- Basic student edit (belt / branch / status) for unlocked staff on /access
CREATE OR REPLACE FUNCTION public.admin_update_student_basic(
  p_student_id uuid,
  p_belt text DEFAULT NULL,
  p_branch_id text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_actor text DEFAULT 'admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old students%ROWTYPE;
  v_status text;
BEGIN
  SELECT * INTO v_old FROM students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  v_status := CASE WHEN p_status IS NULL OR btrim(p_status) = '' THEN NULL ELSE lower(btrim(p_status)) END;
  IF v_status IS NOT NULL AND v_status NOT IN ('active','inactive','trial') THEN
    RAISE EXCEPTION 'Invalid status: %. Use active, inactive or trial (withdrawal requires approval).', p_status;
  END IF;

  UPDATE students SET
    current_belt = CASE WHEN p_belt IS NOT NULL THEN NULLIF(btrim(p_belt),'') ELSE current_belt END,
    branch_id = COALESCE(NULLIF(btrim(coalesce(p_branch_id,'')),''), branch_id),
    status = COALESCE(v_status, status),
    updated_at = now(),
    updated_by = p_actor
  WHERE id = p_student_id;

  IF p_belt IS NOT NULL AND NULLIF(btrim(p_belt),'') IS DISTINCT FROM v_old.current_belt THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'current_belt', v_old.current_belt, NULLIF(btrim(p_belt),''), p_actor);
  END IF;
  IF p_branch_id IS NOT NULL AND NULLIF(btrim(p_branch_id),'') IS DISTINCT FROM v_old.branch_id THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'branch_id', v_old.branch_id, btrim(p_branch_id), p_actor);
  END IF;
  IF v_status IS NOT NULL AND v_status IS DISTINCT FROM v_old.status THEN
    INSERT INTO student_change_logs (student_id, action, field_name, old_value, new_value, changed_by)
    VALUES (p_student_id, 'update', 'status', v_old.status, v_status, p_actor);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_student_basic(uuid, text, text, text, text) TO anon, authenticated, service_role;