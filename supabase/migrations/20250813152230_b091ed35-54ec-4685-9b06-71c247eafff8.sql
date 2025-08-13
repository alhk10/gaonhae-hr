-- Fix security warnings from linter

-- Fix function search path issues
DROP FUNCTION IF EXISTS public.get_current_user_role();
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.superadmin_users WHERE employee_email = auth.email() AND is_active = true) THEN 'superadmin'
      WHEN EXISTS (SELECT 1 FROM public.admin_access aa 
                   JOIN public.employees e ON aa.employee_id = e.id 
                   WHERE e.email = auth.email() AND (aa.employees OR aa.payroll OR aa.leave_management OR aa.claims OR aa.attendance OR aa.slot_booking OR aa.reports)) THEN 'admin'
      ELSE 'employee'
    END;
$$;

DROP FUNCTION IF EXISTS public.get_current_employee_id();
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = 'public'
AS $$
  SELECT id FROM public.employees WHERE email = auth.email();
$$;

DROP FUNCTION IF EXISTS public.has_admin_access(TEXT);
CREATE OR REPLACE FUNCTION public.has_admin_access(permission_type TEXT)
RETURNS BOOLEAN 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = 'public'
AS $$
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
      WHEN 'slot_booking' THEN aa.slot_booking
      WHEN 'reports' THEN aa.reports
      ELSE false
    END = true
  );
$$;

-- Add missing RLS policies for tables that have RLS enabled but no policies

-- certificates table policies
CREATE POLICY "Employees can view own certificates" ON public.certificates
  FOR SELECT USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Admins can view all certificates" ON public.certificates
  FOR SELECT USING (public.has_admin_access('employees') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage certificates" ON public.certificates
  FOR ALL USING (public.has_admin_access('employees') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('employees') OR public.get_current_user_role() = 'superadmin');

-- clock_status table policies  
CREATE POLICY "Employees can view own clock status" ON public.clock_status
  FOR SELECT USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Employees can manage own clock status" ON public.clock_status
  FOR ALL USING (employee_id = public.get_current_employee_id())
  WITH CHECK (employee_id = public.get_current_employee_id());

CREATE POLICY "Admins can view all clock status" ON public.clock_status
  FOR SELECT USING (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage clock status" ON public.clock_status
  FOR ALL USING (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin');

-- attendance_settings table policies
CREATE POLICY "Admins can view attendance settings" ON public.attendance_settings
  FOR SELECT USING (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage attendance settings" ON public.attendance_settings
  FOR ALL USING (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin');