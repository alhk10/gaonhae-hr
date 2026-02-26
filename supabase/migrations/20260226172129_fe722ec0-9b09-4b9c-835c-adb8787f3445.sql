CREATE POLICY "employees_with_invoice_access_view_branch_students"
  ON public.students
  FOR SELECT
  USING (
    branch_id IN (
      SELECT eia.branch_id 
      FROM public.employee_invoice_access eia
      JOIN public.employees e ON eia.employee_id = e.id
      WHERE e.email = auth.email()
    )
  );