-- Fix INSERT policy for student_withdrawal_requests
DROP POLICY IF EXISTS "Branch staff can insert withdrawal requests" ON public.student_withdrawal_requests;
CREATE POLICY "Branch staff can insert withdrawal requests" ON public.student_withdrawal_requests
FOR INSERT TO authenticated
WITH CHECK (
  get_current_user_role() IN ('admin', 'superadmin')
  OR has_branch_access(branch_id)
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = student_withdrawal_requests.branch_id
  )
);

-- Fix SELECT policy for student_withdrawal_requests
DROP POLICY IF EXISTS "Branch staff can view withdrawal requests" ON public.student_withdrawal_requests;
CREATE POLICY "Branch staff can view withdrawal requests" ON public.student_withdrawal_requests
FOR SELECT TO authenticated
USING (
  get_current_user_role() IN ('admin', 'superadmin')
  OR has_branch_access(branch_id)
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = student_withdrawal_requests.branch_id
  )
);