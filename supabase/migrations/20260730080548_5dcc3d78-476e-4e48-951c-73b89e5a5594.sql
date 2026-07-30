CREATE OR REPLACE FUNCTION public.get_public_student_counts_by_month(p_year int)
RETURNS TABLE (branch_name text, month int, student_count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH months AS (
    SELECT gs::date AS m_start,
           (gs + interval '1 month - 1 day')::date AS m_end,
           EXTRACT(MONTH FROM gs)::int AS m_num
    FROM generate_series(
      make_date(p_year, 1, 1),
      make_date(p_year, 12, 1),
      interval '1 month'
    ) AS gs
  ),
  ents AS (
    SELECT e.student_id,
           COALESCE(NULLIF(b.name, ''), '—') AS branch_name,
           e.valid_from,
           COALESCE(e.valid_to, e.valid_from) AS valid_to,
           (COALESCE(e.valid_to, e.valid_from) - e.valid_from) <= 35 AS is_short
    FROM public.entitlements e
    LEFT JOIN public.products p ON p.id = e.product_id
    LEFT JOIN public.branches b ON b.id = e.branch_scope
    WHERE e.is_active
      AND e.valid_from IS NOT NULL
      AND e.student_id IS NOT NULL
      AND COALESCE(p.name, '') NOT IN ('Trial Lesson', 'Ad-Hoc Lesson')
  )
  SELECT ents.branch_name,
         months.m_num AS month,
         COUNT(DISTINCT ents.student_id)::int AS student_count
  FROM ents
  JOIN months ON (
    CASE
      WHEN ents.is_short
        THEN ents.valid_from BETWEEN months.m_start AND months.m_end
      ELSE ents.valid_from <= months.m_end AND ents.valid_to >= months.m_start
    END
  )
  GROUP BY ents.branch_name, months.m_num
  ORDER BY ents.branch_name, months.m_num;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_counts_by_month(int) TO anon, authenticated;