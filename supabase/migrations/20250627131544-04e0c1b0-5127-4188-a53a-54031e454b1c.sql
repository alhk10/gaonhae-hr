
-- Add join_date column to employees table
ALTER TABLE public.employees 
ADD COLUMN join_date date;

-- Update existing employees with a default join date if needed
-- You may want to update specific employees with their actual join dates
UPDATE public.employees 
SET join_date = created_at::date 
WHERE join_date IS NULL;
