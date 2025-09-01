-- Rename slot_booking column to slotBooking in admin_access table
ALTER TABLE public.admin_access 
RENAME COLUMN slot_booking TO "slotBooking";

-- Update has_admin_access function to use new column name
CREATE OR REPLACE FUNCTION public.has_admin_access(permission_type text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_access aa 
    JOIN public.employees e ON aa.employee_id = e.id 
    WHERE e.email = auth.email() 
    AND CASE permission_type
      WHEN 'employees' THEN aa.employees
      WHEN 'payroll' THEN aa.payroll
      WHEN 'leave_management' THEN aa.leave_management
      WHEN 'claims' THEN aa.claims
      WHEN 'attendance' THEN aa.attendance
      WHEN 'slotBooking' THEN aa."slotBooking"
      WHEN 'reports' THEN aa.reports
      ELSE false
    END = true
  );
$function$;

-- Update check_employee_admin_access function to use new column name
CREATE OR REPLACE FUNCTION public.check_employee_admin_access()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- First check if user is a superadmin (highest priority)
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
      aa."slotBooking" = true OR 
      aa.reports = true
    )
  );
$function$;