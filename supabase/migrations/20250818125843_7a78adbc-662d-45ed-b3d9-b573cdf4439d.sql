-- Fix remaining security issues with employee-related tables

-- Fix slot_bookings_new table RLS policies
DROP POLICY IF EXISTS "Users can delete slot bookings" ON public.slot_bookings_new;
DROP POLICY IF EXISTS "Users can insert slot bookings" ON public.slot_bookings_new;
DROP POLICY IF EXISTS "Users can update slot bookings" ON public.slot_bookings_new;
DROP POLICY IF EXISTS "Users can view slot bookings" ON public.slot_bookings_new;

-- Create secure policies for slot_bookings_new
CREATE POLICY "Admins can manage all slot bookings"
ON public.slot_bookings_new
FOR ALL
TO authenticated
USING (public.check_employee_admin_access())
WITH CHECK (public.check_employee_admin_access());

-- Employees can only view/manage their own bookings
CREATE POLICY "Employees manage own slot bookings"
ON public.slot_bookings_new
FOR ALL
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE email = auth.email()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employees WHERE email = auth.email()
  )
);

-- Fix employee_page_access table
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.employee_page_access;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.employee_page_access;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.employee_page_access;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.employee_page_access;

-- Create secure policies for employee_page_access
CREATE POLICY "Admins can manage all page access"
ON public.employee_page_access
FOR ALL
TO authenticated
USING (public.check_employee_admin_access())
WITH CHECK (public.check_employee_admin_access());

-- Employees can only view their own page access
CREATE POLICY "Employees view own page access"
ON public.employee_page_access
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE email = auth.email()
  )
);

-- Fix location_exceptions table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.location_exceptions;

-- Create secure policies for location_exceptions
CREATE POLICY "Admins can manage all location exceptions"
ON public.location_exceptions
FOR ALL
TO authenticated
USING (public.check_employee_admin_access())
WITH CHECK (public.check_employee_admin_access());

-- Employees can only view their own location exceptions
CREATE POLICY "Employees view own location exceptions"
ON public.location_exceptions
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE email = auth.email()
  )
);

-- Fix clock_status table
DROP POLICY IF EXISTS "Users can create clock status" ON public.clock_status;
DROP POLICY IF EXISTS "Users can delete clock status" ON public.clock_status;
DROP POLICY IF EXISTS "Users can update clock status" ON public.clock_status;
DROP POLICY IF EXISTS "Users can view clock status" ON public.clock_status;

-- Create secure policies for clock_status
CREATE POLICY "Admins can manage all clock status"
ON public.clock_status
FOR ALL
TO authenticated
USING (public.check_employee_admin_access())
WITH CHECK (public.check_employee_admin_access());

-- Employees can only manage their own clock status
CREATE POLICY "Employees manage own clock status"
ON public.clock_status
FOR ALL
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE email = auth.email()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employees WHERE email = auth.email()
  )
);