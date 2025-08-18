-- Fix security issues with employees table RLS policies
-- The current policies use has_admin_access() which references employees table, creating circular dependency

-- First, create a secure function to check employee admin access without circular dependency
CREATE OR REPLACE FUNCTION public.check_employee_admin_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.superadmin_users su
    WHERE su.employee_email = auth.email() AND su.is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.admin_access aa 
    WHERE aa.employee_id IN (
      SELECT e.id FROM public.employees e WHERE e.email = auth.email()
    ) AND aa.employees = true
  );
$$;

-- Drop existing policies on employees table
DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can update employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
DROP POLICY IF EXISTS "Superadmins can delete employees" ON public.employees;

-- Create secure RLS policies for employees table
-- Policy 1: Only superadmins and employees with admin access can view all employee records
CREATE POLICY "Secure admin view all employees"
ON public.employees
FOR SELECT
TO authenticated
USING (public.check_employee_admin_access());

-- Policy 2: Employees can only view their own record
CREATE POLICY "Employees view own record only"
ON public.employees
FOR SELECT
TO authenticated
USING (email = auth.email());

-- Policy 3: Only superadmins and employees with admin access can insert employees
CREATE POLICY "Secure admin insert employees"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (public.check_employee_admin_access());

-- Policy 4: Only superadmins and employees with admin access can update employees
CREATE POLICY "Secure admin update employees"
ON public.employees
FOR UPDATE
TO authenticated
USING (public.check_employee_admin_access());

-- Policy 5: Only superadmins can delete employees
CREATE POLICY "Only superadmins delete employees"
ON public.employees
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.superadmin_users su
    WHERE su.employee_email = auth.email() AND su.is_active = true
  )
);

-- Fix admin_access table to prevent exposure of admin privileges
DROP POLICY IF EXISTS "Allow all access to admin_access" ON public.admin_access;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.admin_access;

-- Create secure policies for admin_access table
CREATE POLICY "Superadmins can manage admin access"
ON public.admin_access
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.superadmin_users su
    WHERE su.employee_email = auth.email() AND su.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.superadmin_users su
    WHERE su.employee_email = auth.email() AND su.is_active = true
  )
);

-- Employees can only view their own admin access
CREATE POLICY "Employees view own admin access"
ON public.admin_access
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE email = auth.email()
  )
);

-- Fix superadmin_users table to prevent exposure
DROP POLICY IF EXISTS "Users can delete superadmin users" ON public.superadmin_users;
DROP POLICY IF EXISTS "Users can insert superadmin users" ON public.superadmin_users;
DROP POLICY IF EXISTS "Users can update superadmin users" ON public.superadmin_users;
DROP POLICY IF EXISTS "Users can view superadmin users" ON public.superadmin_users;

-- Create secure policies for superadmin_users table
CREATE POLICY "Only superadmins can manage superadmin users"
ON public.superadmin_users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.superadmin_users su
    WHERE su.employee_email = auth.email() AND su.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.superadmin_users su
    WHERE su.employee_email = auth.email() AND su.is_active = true
  )
);

-- Fix system_settings table
DROP POLICY IF EXISTS "Users can create system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Users can delete system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Users can update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Users can view system settings" ON public.system_settings;

-- Create secure policies for system_settings
CREATE POLICY "Only superadmins can manage system settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.superadmin_users su
    WHERE su.employee_email = auth.email() AND su.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.superadmin_users su
    WHERE su.employee_email = auth.email() AND su.is_active = true
  )
);