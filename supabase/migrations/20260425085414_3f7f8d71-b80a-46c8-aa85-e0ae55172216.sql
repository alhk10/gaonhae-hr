ALTER TABLE public.grading_registrations
  ADD COLUMN IF NOT EXISTS result_manual_override boolean NOT NULL DEFAULT false;

UPDATE public.grading_registrations
  SET result_manual_override = true
  WHERE result IS NOT NULL;