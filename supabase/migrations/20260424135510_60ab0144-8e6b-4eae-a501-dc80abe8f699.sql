-- Backfill: restore Ready for Grading on registrations whose term has already started
-- and have no result recorded yet. This corrects any rows that were temporarily
-- reset to false for terms that are actually current/past (e.g. Term 1 2026).
UPDATE public.grading_registrations gr
SET ready_for_grading = true
FROM public.term_calendars t
WHERE gr.term_id = t.id
  AND t.start_date <= CURRENT_DATE
  AND gr.grading_slot_id IS NOT NULL
  AND gr.result IS NULL
  AND gr.ready_for_grading = false;