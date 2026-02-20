ALTER TABLE public.grading_slots
  ADD COLUMN IF NOT EXISTS min_age integer,
  ADD COLUMN IF NOT EXISTS max_age integer;