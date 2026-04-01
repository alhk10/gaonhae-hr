

## Plan: Fix Withdrawal Request RLS for Invoice-Access Employees

### Problem
The `student_withdrawal_requests` INSERT policy only allows `has_branch_access(branch_id)` (which checks `employee_branch_access`). The user `ysn.gaonhaetaekwondo@gmail.com` only has `employee_invoice_access`, so the insert is denied.

### Solution
Update the INSERT and SELECT policies on `student_withdrawal_requests` to also allow employees with `employee_invoice_access` for the relevant branch.

### Database Migration

```sql
-- Fix INSERT policy
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

-- Fix SELECT policy
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
```

### No code changes needed
The `studentWithdrawalRequestService.ts` logic is correct — only the RLS policies are blocking the operation.

