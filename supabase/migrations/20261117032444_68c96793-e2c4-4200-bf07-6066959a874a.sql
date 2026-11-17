CREATE OR REPLACE FUNCTION public.access_student_invoice_dues(p_student_ids uuid[], p_term_id uuid DEFAULT NULL)
RETURNS TABLE(student_id uuid, term_invoice_date date, other_unpaid_total numeric, other_unpaid_oldest date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH term_inv AS (
    SELECT DISTINCT i.id, i.student_id, i.issue_date FROM invoices i
    JOIN invoice_items ii ON ii.invoice_id = i.id
    JOIN products p ON p.id = ii.product_id
    JOIN product_categories pc ON pc.id = p.category_id
    WHERE p_term_id IS NOT NULL AND i.student_id = ANY(p_student_ids) AND pc.name = 'Classes'
      AND coalesce(ii.metadata->>'term_id', p.term_id::text) = p_term_id::text
      AND lower(coalesce(i.status,'')) NOT IN ('cancelled','void','replaced')
  ), other AS (
    SELECT i.student_id, sum(i.balance_due) total, min(coalesce(i.issue_date, i.created_at::date)) oldest
    FROM invoices i
    WHERE i.student_id = ANY(p_student_ids) AND coalesce(i.balance_due,0) > 0.004
      AND lower(coalesce(i.status,'')) NOT IN ('cancelled','void','replaced','refunded')
      AND coalesce(i.issue_date, i.created_at::date) >= DATE '2026-04-01'
      AND i.id NOT IN (SELECT id FROM term_inv)
    GROUP BY i.student_id
  )
  SELECT s.id, (SELECT min(t.issue_date) FROM term_inv t WHERE t.student_id = s.id), o.total, o.oldest
  FROM unnest(p_student_ids) s(id) LEFT JOIN other o ON o.student_id = s.id;
$$;
GRANT EXECUTE ON FUNCTION public.access_student_invoice_dues(uuid[], uuid) TO anon, authenticated;