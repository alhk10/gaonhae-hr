UPDATE public.grading_registrations
SET ready_for_grading = false
WHERE term_id = '93c68375-31d9-406a-adfa-07fc24614428'  -- Term 2 2026 (BR1768967806476)
  AND ready_for_grading = true
  AND result IS NULL;