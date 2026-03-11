-- Allow employees with sales/admin access to delete grading registrations (needed for invoice deletion cascade)
CREATE POLICY "sales_staff_delete_grading_registrations"
ON public.grading_registrations
FOR DELETE
TO authenticated
USING (
  get_current_user_role() = 'superadmin'
  OR has_sales_access()
);