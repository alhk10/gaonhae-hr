CREATE POLICY "invoice_access_update_payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
      AND eia.can_edit = true
      AND eia.branch_id = (
        SELECT i.branch_id FROM invoices i WHERE i.id = payments.invoice_id
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
      AND eia.can_edit = true
      AND eia.branch_id = (
        SELECT i.branch_id FROM invoices i WHERE i.id = payments.invoice_id
      )
  )
);