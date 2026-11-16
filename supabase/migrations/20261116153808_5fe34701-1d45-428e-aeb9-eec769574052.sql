CREATE OR REPLACE FUNCTION public.get_public_student_counts_by_month(p_year integer)
 RETURNS TABLE(branch_name text, month integer, student_count integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH yt AS MATERIALIZED (
    SELECT id FROM term_calendars
    WHERE start_date <= make_date(p_year,12,31) AND end_date >= make_date(p_year,1,1)
  ), st AS MATERIALIZED (
    SELECT DISTINCT i.student_id, coalesce(ii.metadata->>'term_id', p.term_id::text)::uuid AS term_id
    FROM invoices i
    JOIN invoice_items ii ON ii.invoice_id = i.id
    JOIN products p ON p.id = ii.product_id
    JOIN product_categories pc ON pc.id = p.category_id
    WHERE pc.name = 'Classes' AND COALESCE(p.is_adhoc_lesson,false) = false
      AND COALESCE(p.name,'') NOT IN ('Trial Lesson','Ad-Hoc Lesson')
      AND i.status IN ('paid','verified') AND i.student_id IS NOT NULL
      AND coalesce(ii.metadata->>'term_id', p.term_id::text)::uuid IN (SELECT id FROM yt)
  ), cov AS MATERIALIZED (
    SELECT st.student_id, st.term_id, public._term_coverage(st.student_id, st.term_id) c FROM st
  ), lessons AS (
    SELECT cov.student_id, d::date AS d,
      (cov.c->>'covered_until') IS NOT NULL
        AND d::date BETWEEN (cov.c->>'covered_from')::date AND (cov.c->>'covered_until')::date AS covered
    FROM cov JOIN term_calendars t ON t.id = cov.term_id
    CROSS JOIN LATERAL generate_series(t.start_date, t.end_date, interval '7 days') d
    WHERE cov.c IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM term_breaks tb WHERE tb.term_id = t.id AND d::date BETWEEN tb.start_date AND tb.end_date)
  ), per_month AS (
    SELECT student_id, EXTRACT(MONTH FROM d)::int m
    FROM lessons WHERE EXTRACT(YEAR FROM d)::int = p_year
    GROUP BY student_id, EXTRACT(MONTH FROM d)
    HAVING count(*) FILTER (WHERE covered) * 2 > count(*)
  )
  SELECT COALESCE(NULLIF(b.name,''),'—'), pm.m, COUNT(DISTINCT pm.student_id)::int
  FROM per_month pm JOIN students s ON s.id = pm.student_id
  LEFT JOIN branches b ON b.id = s.branch_id
  WHERE NOT COALESCE(s.is_employee,false)
  GROUP BY 1, 2 ORDER BY 1, 2;
$function$;