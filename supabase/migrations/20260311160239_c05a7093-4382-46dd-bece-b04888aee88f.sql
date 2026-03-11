-- Allow employees with invoice access to INSERT invoices for their assigned branches
CREATE POLICY "invoice_access_insert_invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_create = true
    AND eia.branch_id = branch_id
  )
);

-- Allow employees with invoice access to SELECT invoices for their assigned branches
CREATE POLICY "invoice_access_select_invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = invoices.branch_id
  )
);

-- Allow employees with invoice access to UPDATE invoices for their assigned branches
CREATE POLICY "invoice_access_update_invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_edit = true
    AND eia.branch_id = invoices.branch_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employee_invoice_access eia
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_edit = true
    AND eia.branch_id = branch_id
  )
);

-- Allow employees with invoice access to INSERT invoice_items for invoices in their branches
CREATE POLICY "invoice_access_insert_invoice_items"
ON public.invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.employee_invoice_access eia ON eia.branch_id = i.branch_id
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_create = true
    AND i.id = invoice_id
  )
);

-- Allow employees with invoice access to SELECT invoice_items for invoices in their branches
CREATE POLICY "invoice_access_select_invoice_items"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.employee_invoice_access eia ON eia.branch_id = i.branch_id
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND i.id = invoice_items.invoice_id
  )
);

-- Allow employees with invoice access to UPDATE invoice_items for invoices in their branches
CREATE POLICY "invoice_access_update_invoice_items"
ON public.invoice_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.employee_invoice_access eia ON eia.branch_id = i.branch_id
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_edit = true
    AND i.id = invoice_items.invoice_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.employee_invoice_access eia ON eia.branch_id = i.branch_id
    JOIN public.employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_edit = true
    AND i.id = invoice_id
  )
);