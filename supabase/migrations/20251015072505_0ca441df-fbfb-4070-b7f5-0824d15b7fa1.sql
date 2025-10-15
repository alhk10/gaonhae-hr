-- Optimize employees table RLS policies
-- Remove redundant admin check since "Users can view employee data" already allows all reads

-- Drop the redundant policy that calls expensive function
DROP POLICY IF EXISTS "Secure admin view all employees" ON public.employees;

-- The remaining policies are:
-- 1. "Employees view own record only" - allows users to see their own record
-- 2. "Users can view employee data" - allows anyone to view any employee (this is sufficient)
-- 3. Admin policies for insert/update/delete operations

-- Add index on superadmin_users.employee_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_superadmin_users_employee_email 
ON public.superadmin_users(employee_email) 
WHERE is_active = true;

-- Add composite index on admin_access for faster permission checks
CREATE INDEX IF NOT EXISTS idx_admin_access_employee_permissions
ON public.admin_access(employee_id) 
WHERE (employees = true OR payroll = true OR leave_management = true OR 
       claims = true OR attendance = true OR "slotBooking" = true OR reports = true);