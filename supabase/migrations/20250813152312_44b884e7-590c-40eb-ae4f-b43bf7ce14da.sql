-- Fix security warnings from linter (with CASCADE to handle dependencies)

-- Fix function search path issues by recreating with proper search_path
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
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

DROP FUNCTION IF EXISTS public.get_current_employee_id() CASCADE;
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = 'public'
AS $$
  SELECT id FROM public.employees WHERE email = auth.email();
$$;

DROP FUNCTION IF EXISTS public.has_admin_access(TEXT) CASCADE;
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

-- Recreate the critical RLS policies that were dropped with CASCADE
-- Secure employees table
CREATE POLICY "Employees can view own record" ON public.employees
  FOR SELECT USING (email = auth.email());

CREATE POLICY "Admins can view all employees" ON public.employees
  FOR SELECT USING (public.has_admin_access('employees') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can insert employees" ON public.employees
  FOR INSERT WITH CHECK (public.has_admin_access('employees') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can update employees" ON public.employees
  FOR UPDATE USING (public.has_admin_access('employees') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmins can delete employees" ON public.employees
  FOR DELETE USING (public.get_current_user_role() = 'superadmin');

-- Recreate payroll policies
CREATE POLICY "Employees can view own payroll" ON public.payroll_records
  FOR SELECT USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Admins can view all payroll" ON public.payroll_records
  FOR SELECT USING (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage payroll" ON public.payroll_records
  FOR ALL USING (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin');

-- Recreate other critical policies
CREATE POLICY "Superadmins can view all sessions" ON public.user_sessions
  FOR SELECT USING (public.get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmins can view audit log" ON public.security_audit_log
  FOR SELECT USING (public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can view all attendance" ON public.attendance
  FOR SELECT USING (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage attendance" ON public.attendance
  FOR ALL USING (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can view all leave requests" ON public.leave_requests
  FOR SELECT USING (public.has_admin_access('leave_management') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage leave requests" ON public.leave_requests
  FOR ALL USING (public.has_admin_access('leave_management') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('leave_management') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can view all claims" ON public.claims
  FOR SELECT USING (public.has_admin_access('claims') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage claims" ON public.claims
  FOR ALL USING (public.has_admin_access('claims') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('claims') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage allowances" ON public.allowances
  FOR ALL USING (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage deductions" ON public.deductions
  FOR ALL USING (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin');

-- Add missing RLS policies for tables that need them
CREATE POLICY "Employees can view own certificates" ON public.certificates
  FOR SELECT USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Admins can view all certificates" ON public.certificates
  FOR SELECT USING (public.has_admin_access('employees') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage certificates" ON public.certificates
  FOR ALL USING (public.has_admin_access('employees') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('employees') OR public.get_current_user_role() = 'superadmin');

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

CREATE POLICY "Admins can view attendance settings" ON public.attendance_settings
  FOR SELECT USING (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage attendance settings" ON public.attendance_settings
  FOR ALL USING (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin');