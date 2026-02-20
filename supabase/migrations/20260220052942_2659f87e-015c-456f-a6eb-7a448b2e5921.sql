ALTER TABLE public.grading_slots
  ADD COLUMN IF NOT EXISTS available_branch_ids text[] DEFAULT NULL;