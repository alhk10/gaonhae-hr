-- Add SELECT policy for employees with invoice access on student_class_enrollments
CREATE POLICY "invoice_access_select_enrollments"
ON public.student_class_enrollments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
  )
);