UPDATE public.grading_slots
SET available_branch_ids = ARRAY['balmoral','bukit-merah','BR1769014228743','BR1769014316844','jurong-west','kembangan','yishun']
WHERE grading_date = '2026-06-28'
  AND branch_id = 'balmoral'
  AND (available_branch_ids IS NULL OR array_length(available_branch_ids, 1) IS NULL);