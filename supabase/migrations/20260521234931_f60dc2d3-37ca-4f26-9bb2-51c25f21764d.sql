
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
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, NULL) THEN RETURN; END IF;

  SELECT s.branch_id INTO v_branch FROM students s WHERE s.id = p_student_id;
  IF v_branch IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH candidate_terms AS (
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
      )
  ),
  ranked AS (
    SELECT ct.*,
      ROW_NUMBER() OVER (
        ORDER BY
          CASE WHEN CURRENT_DATE BETWEEN ct.start_date AND ct.end_date THEN 0 ELSE 1 END,
          ct.start_date ASC
      ) AS rn
    FROM candidate_terms ct
  )
  SELECT
    r.term_id, r.term_name, r.start_date, r.end_date,
    (r.rn = 1) AS is_current,
    EXISTS (
      SELECT 1 FROM entitlements ent
      LEFT JOIN products p ON p.id = ent.product_id
      WHERE ent.student_id = p_student_id
        AND ent.is_active = true
        AND (ent.valid_to IS NULL OR ent.valid_to >= r.start_date)
        AND (ent.valid_from IS NULL OR ent.valid_from <= r.end_date)
        AND (p.name ILIKE '%unlimited%' OR ent.sessions_total IS NULL)
    ) AS is_unlimited,
    COALESCE((
      SELECT SUM(ent.sessions_total)::integer FROM entitlements ent
      WHERE ent.student_id = p_student_id AND ent.is_active = true
        AND (ent.valid_to IS NULL OR ent.valid_to >= r.start_date)
        AND (ent.valid_from IS NULL OR ent.valid_from <= r.end_date)
    ), 0) AS sessions_total,
    COALESCE((
      SELECT SUM(ent.sessions_remaining)::integer FROM entitlements ent
      WHERE ent.student_id = p_student_id AND ent.is_active = true
        AND (ent.valid_to IS NULL OR ent.valid_to >= r.start_date)
        AND (ent.valid_from IS NULL OR ent.valid_from <= r.end_date)
    ), 0) AS sessions_remaining
  FROM ranked r
  ORDER BY r.start_date ASC;
END;
$$;
