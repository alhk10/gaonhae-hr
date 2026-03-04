
INSERT INTO public.entitlements (
  student_id, product_id, source_type, source_id,
  sessions_total, sessions_used,
  is_active, valid_from, branch_scope, notes
)
SELECT
  i.student_id, ii.product_id, 'invoice_item', ii.id,
  ii.quantity, 0,
  true, COALESCE(i.issue_date::date, i.created_at::date),
  i.branch_id,
  'Backfilled from invoice ' || i.invoice_number
FROM invoice_items ii
JOIN invoices i ON ii.invoice_id = i.id
JOIN products p ON ii.product_id = p.id
WHERE p.is_lesson = true
AND NOT EXISTS (
  SELECT 1 FROM entitlements e WHERE e.source_id = ii.id AND e.source_type = 'invoice_item'
);
