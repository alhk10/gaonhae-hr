-- Fix infinite recursion in superadmin_users RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Only existing superadmins can manage superadmin users" ON public.superadmin_users;
DROP POLICY IF EXISTS "Allow reading superladmin status by email match" ON public.superadmin_users;
DROP POLICY IF EXISTS "Allow authenticated users to view superadmin status" ON public.superadmin_users;

-- Create simple, non-recursive policies
-- Allow all authenticated users to read superadmin status (needed for role checking)
CREATE POLICY "Allow reading superadmin status" 
ON public.superadmin_users 
FOR SELECT 
TO authenticated 
USING (true);

-- Only allow superadmins to insert/update/delete (using direct email match)
CREATE POLICY "Superadmins can manage users" 
ON public.superadmin_users 
FOR ALL 
TO authenticated 
USING (employee_email = auth.email())
WITH CHECK (employee_email = auth.email());

-- Create a separate policy for system operations if needed
CREATE POLICY "System can insert superadmin users" 
ON public.superadmin_users 
FOR INSERT 
TO service_role 
WITH CHECK (true);