DROP POLICY IF EXISTS "staff_insert_students" ON public.students;

CREATE POLICY "staff_insert_students"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_role() = 'superadmin'
  OR has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_create = true
    AND eia.branch_id = branch_id
  )
);