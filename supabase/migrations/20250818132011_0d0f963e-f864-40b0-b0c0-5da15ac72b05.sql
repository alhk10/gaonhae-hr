-- Fix superadmin access and clock-in issues

-- Phase 1: Fix Superladmin Access
-- Update admin_access for alhk10@gmail.com to have full permissions since they're a superadmin
UPDATE admin_access 
SET 
  employees = true,
  payroll = true, 
  leave_management = true,
  claims = true,
  attendance = true,
  slot_booking = true,
  reports = true
WHERE employee_id = 'EMP1751003565851';

-- If no admin_access record exists, create one
INSERT INTO admin_access (employee_id, employees, payroll, leave_management, claims, attendance, slot_booking, reports)
SELECT 'EMP1751003565851', true, true, true, true, true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM admin_access WHERE employee_id = 'EMP1751003565851'
);

-- Phase 2: Add location exceptions for employees who can't clock in
-- Check if exceptions already exist before inserting
INSERT INTO location_exceptions (employee_id, reason, created_by, enabled, expires_at)
SELECT 'EMP1751007228999', 'Remote work allowance for approved slot booking dates', 'system', true, '2025-12-31 23:59:59'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM location_exceptions WHERE employee_id = 'EMP1751007228999' AND enabled = true);

INSERT INTO location_exceptions (employee_id, reason, created_by, enabled, expires_at)  
SELECT 'EMP1751006564567', 'Remote work allowance for approved slot booking dates', 'system', true, '2025-12-31 23:59:59'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM location_exceptions WHERE employee_id = 'EMP1751006564567' AND enabled = true);

INSERT INTO location_exceptions (employee_id, reason, created_by, enabled, expires_at)
SELECT 'EMP1751006728858', 'Remote work allowance for approved slot booking dates', 'system', true, '2025-12-31 23:59:59'::timestamp  
WHERE NOT EXISTS (SELECT 1 FROM location_exceptions WHERE employee_id = 'EMP1751006728858' AND enabled = true);

INSERT INTO location_exceptions (employee_id, reason, created_by, enabled, expires_at)
SELECT 'EMP1751006984631', 'Remote work allowance for approved slot booking dates', 'system', true, '2025-12-31 23:59:59'::timestamp
WHERE NOT EXISTS (SELECT 1 FROM location_exceptions WHERE employee_id = 'EMP1751006984631' AND enabled = true);

-- Phase 3: Ensure check_employee_admin_access function properly handles superladmins
CREATE OR REPLACE FUNCTION public.check_employee_admin_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- First check if user is a superladmin (highest priority)
  SELECT EXISTS (
    SELECT 1 FROM public.superadmin_users su
    WHERE su.employee_email = auth.email() AND su.is_active = true
  ) 
  OR 
  -- Then check if they have any admin access permissions
  EXISTS (
    SELECT 1 FROM public.admin_access aa 
    WHERE aa.employee_id IN (
      SELECT e.id FROM public.employees e WHERE e.email = auth.email()
    ) AND (
      aa.employees = true OR 
      aa.payroll = true OR 
      aa.leave_management = true OR 
      aa.claims = true OR 
      aa.attendance = true OR 
      aa.slot_booking = true OR 
      aa.reports = true
    )
  );
$$;