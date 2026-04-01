
-- Add term_id column to grading_registrations
ALTER TABLE public.grading_registrations
ADD COLUMN term_id UUID REFERENCES public.term_calendars(id);

-- Backfill: assign term_id based on student's branch + registration created_at date
UPDATE public.grading_registrations gr
SET term_id = (
  SELECT tc.id FROM public.term_calendars tc
  JOIN public.students s ON s.branch_id = tc.branch_id
  WHERE s.id = gr.student_id
    AND tc.is_active = true
    AND gr.created_at::date BETWEEN tc.start_date AND tc.end_date
  ORDER BY tc.start_date DESC
  LIMIT 1
)
WHERE gr.term_id IS NULL;

-- For any remaining NULLs (created outside any term range), assign the nearest past term
UPDATE public.grading_registrations gr
SET term_id = (
  SELECT tc.id FROM public.term_calendars tc
  JOIN public.students s ON s.branch_id = tc.branch_id
  WHERE s.id = gr.student_id
    AND tc.is_active = true
    AND tc.start_date <= gr.created_at::date
  ORDER BY tc.start_date DESC
  LIMIT 1
)
WHERE gr.term_id IS NULL;

-- Unique constraint: one registration per student per term
ALTER TABLE public.grading_registrations
ADD CONSTRAINT grading_registrations_student_term_unique UNIQUE (student_id, term_id);
