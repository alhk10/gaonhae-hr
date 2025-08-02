-- Add new fields to payroll_records table for draft/finalize functionality
ALTER TABLE public.payroll_records 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS finalized_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS finalized_by text;

-- Update existing records to have 'finalized' status if they are locked
UPDATE public.payroll_records 
SET status = 'finalized' 
WHERE is_locked = true AND status = 'draft';

-- Add a check constraint for valid status values
ALTER TABLE public.payroll_records 
ADD CONSTRAINT payroll_records_status_check 
CHECK (status IN ('draft', 'finalized', 'processed'));