-- Add qualifications column to employees table
ALTER TABLE public.employees 
ADD COLUMN qualifications JSONB DEFAULT '{}'::jsonb;