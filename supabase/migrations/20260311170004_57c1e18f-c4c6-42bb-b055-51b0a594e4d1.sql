UPDATE grading_registrations gr
SET 
  grading_slot_id = (ii.metadata->>'grading_slot_id')::uuid,
  target_belt = COALESCE(ii.metadata->>'target_belt', gr.target_belt)
FROM invoice_items ii
WHERE gr.invoice_item_id = ii.id
  AND gr.grading_slot_id IS NULL
  AND ii.metadata IS NOT NULL
  AND (ii.metadata->>'grading_slot_id') IS NOT NULL;