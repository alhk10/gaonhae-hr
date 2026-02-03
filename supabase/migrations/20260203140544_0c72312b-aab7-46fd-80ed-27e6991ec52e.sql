-- Remove the unique constraint on email column to allow multiple students with the same parent email
-- This enables the multi-student access feature where parents with multiple children use the same email

-- First, drop the unique constraint on the email column
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_email_key;

-- Add a comment explaining the change
COMMENT ON COLUMN public.students.email IS 'Parent/guardian email address. Multiple students can share the same email to support siblings.';
