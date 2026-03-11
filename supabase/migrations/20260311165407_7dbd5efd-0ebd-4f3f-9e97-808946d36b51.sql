-- Fix existing grading registrations that have been paid but invoice_item_id was never set
-- Match them by finding invoice items with grading metadata for the same student
UPDATE grading_registrations gr
SET invoice_item_id = matched.invoice_item_id
FROM (
  SELECT DISTINCT ON (gr2.id)
    gr2.id AS registration_id,
    ii.id AS invoice_item_id
  FROM grading_registrations gr2
  JOIN students s ON s.id = gr2.student_id
  JOIN invoices i ON i.student_id = s.id
  JOIN invoice_items ii ON ii.invoice_id = i.id
  WHERE gr2.invoice_item_id IS NULL
    AND gr2.ready_for_grading = true
    AND ii.metadata IS NOT NULL
    AND (ii.metadata->>'grading_slot_id') IS NOT NULL
  ORDER BY gr2.id, ii.created_at DESC
) matched
WHERE gr.id = matched.registration_id;