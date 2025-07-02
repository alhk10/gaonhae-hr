
-- Add is_locked column to payroll_records table
ALTER TABLE public.payroll_records 
ADD COLUMN is_locked boolean DEFAULT false;
