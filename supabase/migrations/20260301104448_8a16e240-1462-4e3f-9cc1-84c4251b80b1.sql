
-- Add branch change columns to slot_booking_edit_requests
ALTER TABLE public.slot_booking_edit_requests 
  ADD COLUMN IF NOT EXISTS new_branch_id text,
  ADD COLUMN IF NOT EXISTS new_branch_name text;

-- Drop the employee_branch_requests table
DROP TABLE IF EXISTS public.employee_branch_requests;
