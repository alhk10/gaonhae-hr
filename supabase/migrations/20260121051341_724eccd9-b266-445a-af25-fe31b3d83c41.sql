-- Make last_name nullable to support trial registrations where only first name is required
ALTER TABLE public.students ALTER COLUMN last_name DROP NOT NULL;