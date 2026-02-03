-- Add RLS policy to allow admins with sales module access to update student_auth emails
-- This is needed for the email sync functionality when updating student records

-- First, create a helper function to check if user has sales module access
CREATE OR REPLACE FUNCTION public.has_sales_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    get_current_user_role() = 'superadmin'
    OR EXISTS (
      SELECT 1 FROM public.employee_branch_access eba
      JOIN public.employees e ON eba.employee_id = e.id
      WHERE e.email = auth.email()
      AND eba.can_view_dashboard = true
    );
$$;

-- Add policy for admins to update student_auth records
CREATE POLICY "Admins can update student auth email"
ON public.student_auth
FOR UPDATE
TO authenticated
USING (public.has_sales_access())
WITH CHECK (public.has_sales_access());

-- Add policy for admins to insert student_auth records (for initial portal setup)
CREATE POLICY "Admins can insert student auth"
ON public.student_auth
FOR INSERT
TO authenticated
WITH CHECK (public.has_sales_access());

-- Add policy for admins to delete student_auth records (for revoking access)
CREATE POLICY "Admins can delete student auth"
ON public.student_auth
FOR DELETE
TO authenticated
USING (public.has_sales_access());

-- Also add SELECT policy for admins so they can view student auth records
CREATE POLICY "Admins can view student auth"
ON public.student_auth
FOR SELECT
TO authenticated
USING (public.has_sales_access());

-- Comment documenting the policies
COMMENT ON POLICY "Admins can update student auth email" ON public.student_auth IS 
'Allows admins with sales/dashboard access to update student auth records, primarily for syncing email changes';