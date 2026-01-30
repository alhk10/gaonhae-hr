-- Add Emergency Contact 2 fields and languages_spoken to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS emergency_contact_2_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_2_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_2_relationship text,
ADD COLUMN IF NOT EXISTS languages_spoken text[],
ADD COLUMN IF NOT EXISTS registered_date date;