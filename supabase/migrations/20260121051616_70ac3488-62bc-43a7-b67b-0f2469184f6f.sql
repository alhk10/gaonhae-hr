-- Drop the existing status check constraint and add 'trial' as a valid status
ALTER TABLE public.students DROP CONSTRAINT students_status_check;

ALTER TABLE public.students ADD CONSTRAINT students_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'graduated'::text, 'trial'::text]));