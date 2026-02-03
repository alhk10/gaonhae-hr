-- Remove the unique constraint on student_auth.email
-- This allows multiple students (siblings) to share the same portal email
-- The parent will use one Supabase Auth account shared across all their children
ALTER TABLE public.student_auth 
  DROP CONSTRAINT IF EXISTS student_auth_email_key;