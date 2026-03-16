-- Add INSERT policy for employees with invoice access on grading_registrations
CREATE POLICY "invoice_access_insert_grading_registrations"
ON public.grading_registrations
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_create = true
  )
);

-- Add UPDATE policy for employees with invoice access on grading_registrations
CREATE POLICY "invoice_access_update_grading_registrations"
ON public.grading_registrations
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_edit = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_edit = true
  )
);