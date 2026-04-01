DROP POLICY IF EXISTS "staff_update_students" ON public.students;

CREATE POLICY "staff_update_students" ON public.students
FOR UPDATE TO authenticated
USING (
  get_current_user_role() = 'superadmin'
  OR has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = students.branch_id
  )
)
WITH CHECK (
  get_current_user_role() = 'superadmin'
  OR has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = students.branch_id
  )
);