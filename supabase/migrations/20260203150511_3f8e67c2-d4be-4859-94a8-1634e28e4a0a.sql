-- Remove the unique constraint on student_auth.auth_user_id
-- This allows multiple students (siblings) to share the same Supabase Auth account (parent login)
-- The family uses ONE login credential to access all their children's data
ALTER TABLE public.student_auth 
  DROP CONSTRAINT IF EXISTS student_auth_auth_user_id_key;