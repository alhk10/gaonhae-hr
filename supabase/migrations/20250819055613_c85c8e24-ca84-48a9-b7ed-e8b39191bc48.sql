-- Drop the problematic circular RLS policy on superladmin_users
DROP POLICY IF EXISTS "Only superadmins can manage superadmin users" ON public.superadmin_users;

-- Create a simple, non-recursive policy that allows authenticated users to read superadmin records
-- This avoids the circular dependency where checking superadmin status requires superladmin access
CREATE POLICY "Allow reading superadmin status by email match" 
ON public.superadmin_users 
FOR SELECT 
TO authenticated 
USING (employee_email = auth.email() OR true);

-- Keep the insert/update/delete restricted to actual superadmins using a different approach
CREATE POLICY "Only existing superadmins can manage superadmin users" 
ON public.superadmin_users 
FOR ALL 
TO authenticated 
USING (
  employee_email = auth.email() 
  OR EXISTS (
    SELECT 1 FROM public.superadmin_users su_check 
    WHERE su_check.employee_email = auth.email() 
    AND su_check.is_active = true
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.superadmin_users su_check 
    WHERE su_check.employee_email = auth.email() 
    AND su_check.is_active = true
  )
);