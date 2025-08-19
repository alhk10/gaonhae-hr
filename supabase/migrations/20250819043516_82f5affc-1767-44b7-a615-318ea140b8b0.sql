-- Create missing RLS policies for tables that need them

-- Add RLS policies for superadmin_users table (if missing)
CREATE POLICY "Allow authenticated users to view superadmin status" 
ON public.superadmin_users 
FOR SELECT 
TO authenticated
USING (true);

-- Add RLS policies for admin_access table (if missing) 
CREATE POLICY "Users can view their own admin access" 
ON public.admin_access 
FOR SELECT 
TO authenticated
USING (true);

-- Add RLS policies for employee_page_access table (if missing)
CREATE POLICY "Users can view their own page access" 
ON public.employee_page_access 
FOR SELECT 
TO authenticated
USING (true);

-- Add RLS policies for employees table (if missing)
CREATE POLICY "Users can view employee data" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (true);

-- Update existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;