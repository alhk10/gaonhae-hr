-- Add trial-specific columns to students table
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS trial_date date,
  ADD COLUMN IF NOT EXISTS trial_time time without time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.students.trial_date IS 'Scheduled trial class date for prospective students';
COMMENT ON COLUMN public.students.trial_time IS 'Scheduled trial class time for prospective students';