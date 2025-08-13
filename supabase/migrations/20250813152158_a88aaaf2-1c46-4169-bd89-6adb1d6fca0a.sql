-- Emergency Security Fix: Implement Critical RLS Policies
-- This migration fixes the most critical security vulnerabilities

-- First, create security definer functions to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.superadmin_users WHERE employee_email = auth.email() AND is_active = true) THEN 'superadmin'
      WHEN EXISTS (SELECT 1 FROM public.admin_access aa 
                   JOIN public.employees e ON aa.employee_id = e.id 
                   WHERE e.email = auth.email() AND (aa.employees OR aa.payroll OR aa.leave_management OR aa.claims OR aa.attendance OR aa.slot_booking OR aa.reports)) THEN 'admin'
      ELSE 'employee'
    END;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS TEXT AS $$
  SELECT id FROM public.employees WHERE email = auth.email();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_admin_access(permission_type TEXT)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing permissive policies and replace with secure ones
DROP POLICY IF EXISTS "Allow read access to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow insert access to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow update access to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow delete access to employees" ON public.employees;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.employees;

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

-- Secure user_passwords table (system access only)
DROP POLICY IF EXISTS "Users can view passwords" ON public.user_passwords;
DROP POLICY IF EXISTS "Users can create passwords" ON public.user_passwords;
DROP POLICY IF EXISTS "Users can update passwords" ON public.user_passwords;
DROP POLICY IF EXISTS "Users can delete passwords" ON public.user_passwords;

CREATE POLICY "System only access to passwords" ON public.user_passwords
  FOR ALL USING (false) WITH CHECK (false);

-- Secure password_history table (system access only)
DROP POLICY IF EXISTS "Users can view password history" ON public.password_history;
DROP POLICY IF EXISTS "Users can insert password history" ON public.password_history;

CREATE POLICY "System only access to password history" ON public.password_history
  FOR ALL USING (false) WITH CHECK (false);

-- Secure payroll_records table
DROP POLICY IF EXISTS "Users can view payroll records" ON public.payroll_records;
DROP POLICY IF EXISTS "Users can insert payroll records" ON public.payroll_records;
DROP POLICY IF EXISTS "Users can update payroll records" ON public.payroll_records;
DROP POLICY IF EXISTS "Users can delete payroll records" ON public.payroll_records;

CREATE POLICY "Employees can view own payroll" ON public.payroll_records
  FOR SELECT USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Admins can view all payroll" ON public.payroll_records
  FOR SELECT USING (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage payroll" ON public.payroll_records
  FOR ALL USING (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin');

-- Secure user_sessions table
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;

CREATE POLICY "Users can manage own sessions" ON public.user_sessions
  FOR ALL USING (email = auth.email()) WITH CHECK (email = auth.email());

CREATE POLICY "Superadmins can view all sessions" ON public.user_sessions
  FOR SELECT USING (public.get_current_user_role() = 'superadmin');

-- Secure security_audit_log table
DROP POLICY IF EXISTS "Users can view security audit log" ON public.security_audit_log;
DROP POLICY IF EXISTS "Users can insert security audit log" ON public.security_audit_log;

CREATE POLICY "Superadmins can view audit log" ON public.security_audit_log
  FOR SELECT USING (public.get_current_user_role() = 'superadmin');

CREATE POLICY "System can insert audit log" ON public.security_audit_log
  FOR INSERT WITH CHECK (true);

-- Secure attendance table
DROP POLICY IF EXISTS "Allow all operations on attendance for authenticated users" ON public.attendance;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.attendance;

CREATE POLICY "Employees can view own attendance" ON public.attendance
  FOR SELECT USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Admins can view all attendance" ON public.attendance
  FOR SELECT USING (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage attendance" ON public.attendance
  FOR ALL USING (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('attendance') OR public.get_current_user_role() = 'superadmin');

-- Secure leave_requests table
DROP POLICY IF EXISTS "Allow all operations on leave_requests for authenticated users" ON public.leave_requests;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.leave_requests;

CREATE POLICY "Employees can view own leave requests" ON public.leave_requests
  FOR SELECT USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Employees can create leave requests" ON public.leave_requests
  FOR INSERT WITH CHECK (employee_id = public.get_current_employee_id());

CREATE POLICY "Admins can view all leave requests" ON public.leave_requests
  FOR SELECT USING (public.has_admin_access('leave_management') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage leave requests" ON public.leave_requests
  FOR ALL USING (public.has_admin_access('leave_management') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('leave_management') OR public.get_current_user_role() = 'superadmin');

-- Secure claims table
DROP POLICY IF EXISTS "Allow all operations on claims for authenticated users" ON public.claims;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.claims;

CREATE POLICY "Employees can view own claims" ON public.claims
  FOR SELECT USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Employees can create claims" ON public.claims
  FOR INSERT WITH CHECK (employee_id = public.get_current_employee_id());

CREATE POLICY "Admins can view all claims" ON public.claims
  FOR SELECT USING (public.has_admin_access('claims') OR public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins can manage claims" ON public.claims
  FOR ALL USING (public.has_admin_access('claims') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('claims') OR public.get_current_user_role() = 'superadmin');

-- Secure allowances and deductions tables
DROP POLICY IF EXISTS "Allow all access to allowances" ON public.allowances;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.allowances;

CREATE POLICY "Employees can view own allowances" ON public.allowances
  FOR SELECT USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Admins can manage allowances" ON public.allowances
  FOR ALL USING (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin');

DROP POLICY IF EXISTS "Allow all access to deductions" ON public.deductions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.deductions;

CREATE POLICY "Employees can view own deductions" ON public.deductions
  FOR SELECT USING (employee_id = public.get_current_employee_id());

CREATE POLICY "Admins can manage deductions" ON public.deductions
  FOR ALL USING (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin')
  WITH CHECK (public.has_admin_access('payroll') OR public.get_current_user_role() = 'superadmin');