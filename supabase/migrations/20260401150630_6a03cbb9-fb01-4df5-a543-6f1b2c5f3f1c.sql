-- Add class_attendance policies for invoice-access employees
CREATE POLICY "invoice_access_select_class_attendance" ON public.class_attendance
FOR SELECT TO authenticated
USING (
  has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = class_attendance.branch_id
  )
);

CREATE POLICY "invoice_access_insert_class_attendance" ON public.class_attendance
FOR INSERT TO authenticated
WITH CHECK (
  has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = class_attendance.branch_id
  )
);

CREATE POLICY "invoice_access_update_class_attendance" ON public.class_attendance
FOR UPDATE TO authenticated
USING (
  has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = class_attendance.branch_id
  )
)
WITH CHECK (
  has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = class_attendance.branch_id
  )
);

CREATE POLICY "invoice_access_delete_class_attendance" ON public.class_attendance
FOR DELETE TO authenticated
USING (
  has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = class_attendance.branch_id
  )
);

-- Add entitlements policies for invoice-access employees
-- Need to join through students to get branch_id
CREATE POLICY "invoice_access_select_entitlements" ON public.entitlements
FOR SELECT TO authenticated
USING (
  has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    JOIN students s ON s.id = entitlements.student_id
    WHERE e.email = auth.email()
    AND eia.branch_id = s.branch_id
  )
);

CREATE POLICY "invoice_access_insert_entitlements" ON public.entitlements
FOR INSERT TO authenticated
WITH CHECK (
  has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    JOIN students s ON s.id = entitlements.student_id
    WHERE e.email = auth.email()
    AND eia.branch_id = s.branch_id
  )
);

CREATE POLICY "invoice_access_update_entitlements" ON public.entitlements
FOR UPDATE TO authenticated
USING (
  has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    JOIN students s ON s.id = entitlements.student_id
    WHERE e.email = auth.email()
    AND eia.branch_id = s.branch_id
  )
)
WITH CHECK (
  has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    JOIN students s ON s.id = entitlements.student_id
    WHERE e.email = auth.email()
    AND eia.branch_id = s.branch_id
  )
);