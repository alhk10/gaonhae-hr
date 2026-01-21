-- Add new fields to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS certificate_name TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.students.certificate_name IS 'Name to be printed on certificates. Defaults to first_name + last_name';
COMMENT ON COLUMN public.students.display_name IS 'Name displayed in UI. Defaults to first_name + last_name';
COMMENT ON COLUMN public.students.referral_source IS 'How the student found out about us (family_friends, social_media, pass_by, others)';