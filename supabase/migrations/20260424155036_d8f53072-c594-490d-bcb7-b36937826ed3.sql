ALTER TABLE public.grading_registrations
  ADD COLUMN IF NOT EXISTS scorecard jsonb NOT NULL DEFAULT '[]'::jsonb;