-- Update student_registrations SELECT policy
DROP POLICY IF EXISTS "Admins can view registrations" ON public.student_registrations;
CREATE POLICY "Admins can view registrations"
  ON public.student_registrations FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() = 'superadmin'
    OR public.has_branch_access(branch_id)
    OR EXISTS (
      SELECT 1 FROM employee_invoice_access eia
      JOIN employees e ON eia.employee_id = e.id
      WHERE e.email = auth.email()
      AND eia.branch_id = student_registrations.branch_id
    )
  );

-- Update student_registrations UPDATE policy
DROP POLICY IF EXISTS "Admins can update registrations" ON public.student_registrations;
CREATE POLICY "Admins can update registrations"
  ON public.student_registrations FOR UPDATE
  TO authenticated
  USING (
    public.get_current_user_role() = 'superadmin'
    OR public.has_branch_access(branch_id)
    OR EXISTS (
      SELECT 1 FROM employee_invoice_access eia
      JOIN employees e ON eia.employee_id = e.id
      WHERE e.email = auth.email()
      AND eia.branch_id = student_registrations.branch_id
    )
  );

-- Update student_update_requests policy
DROP POLICY IF EXISTS "Branch managers can manage requests for their students" ON public.student_update_requests;
CREATE POLICY "Branch managers can manage requests for their students"
  ON public.student_update_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee_branch_access eba
      JOIN students s ON s.branch_id = eba.branch_id
      WHERE eba.employee_id = get_current_employee_id()
      AND eba.can_approve_changes = true
      AND s.id = student_update_requests.student_id
    )
    OR EXISTS (
      SELECT 1 FROM employee_invoice_access eia
      JOIN employees e ON eia.employee_id = e.id
      JOIN students s ON s.branch_id = eia.branch_id
      WHERE e.email = auth.email()
      AND s.id = student_update_requests.student_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee_branch_access eba
      JOIN students s ON s.branch_id = eba.branch_id
      WHERE eba.employee_id = get_current_employee_id()
      AND eba.can_approve_changes = true
      AND s.id = student_update_requests.student_id
    )
    OR EXISTS (
      SELECT 1 FROM employee_invoice_access eia
      JOIN employees e ON eia.employee_id = e.id
      JOIN students s ON s.branch_id = eia.branch_id
      WHERE e.email = auth.email()
      AND s.id = student_update_requests.student_id
    )
  );