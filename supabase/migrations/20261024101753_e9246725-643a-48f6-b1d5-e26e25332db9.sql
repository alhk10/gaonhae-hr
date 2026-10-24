CREATE OR REPLACE FUNCTION public.get_access_student_payment_summary(p_branch_id text DEFAULT NULL)
RETURNS TABLE(branch_id text, branch_name text, current_count int, paid_count int, unpaid_count int, no_invoice_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH current_terms AS (
    SELECT DISTINCT ON (t.branch_id) t.id, t.branch_id
    FROM term_calendars t WHERE t.is_active
    ORDER BY t.branch_id, t.start_date DESC
  ),
  inv AS (
    SELECT DISTINCT ON (i.student_id) i.student_id, lower(coalesce(i.status,'')) AS status
    FROM invoices i
    JOIN current_terms ct ON ct.branch_id = i.branch_id
    WHERE lower(coalesce(i.status,'')) NOT IN ('cancelled')
      AND i.issue_date <= now()::date
      AND EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id
        AND (ii.metadata->>'term_id' = ct.id::text
          OR (ii.metadata ? 'term_ids' AND ii.metadata->'term_ids' ? ct.id::text)))
    ORDER BY i.student_id, i.issue_date DESC NULLS LAST, i.created_at DESC
  )
  SELECT s.branch_id, b.name,
    count(*)::int,
    count(*) FILTER (WHERE i.status IN ('paid','verified','paid_verified','pending_verification'))::int,
    count(*) FILTER (WHERE i.status IS NOT NULL AND i.status NOT IN ('paid','verified','paid_verified','pending_verification'))::int,
    count(*) FILTER (WHERE i.status IS NULL)::int
  FROM students s
  LEFT JOIN branches b ON b.id = s.branch_id
  LEFT JOIN inv i ON i.student_id = s.id
  WHERE lower(coalesce(s.status,'')) IN ('active','trial')
    AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
  GROUP BY s.branch_id, b.name
  ORDER BY b.name;
$$;
GRANT EXECUTE ON FUNCTION public.get_access_student_payment_summary(text) TO anon, authenticated, service_role;