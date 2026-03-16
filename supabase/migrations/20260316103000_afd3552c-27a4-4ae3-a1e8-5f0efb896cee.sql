-- Add SELECT policy for employees with invoice access to view payments on their branches
CREATE POLICY "invoice_access_select_payments"
ON public.payments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = (
      SELECT i.branch_id FROM public.invoices i WHERE i.id = payments.invoice_id
    )
  )
);

-- Add INSERT policy for employees with invoice access (can_create)
CREATE POLICY "invoice_access_insert_payments"
ON public.payments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_create = true
    AND eia.branch_id = (
      SELECT i.branch_id FROM public.invoices i WHERE i.id = invoice_id
    )
  )
);

-- Drop the overly broad authenticated insert policy since we now have specific ones
DROP POLICY IF EXISTS "authenticated_insert_payments" ON public.payments;