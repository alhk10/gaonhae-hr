

## Plan: Fix Student Update RLS for Invoice-Access Employees

### Problem
The `staff_update_students` UPDATE policy on the `students` table only allows updates when `has_sales_access()` returns true (which checks `employee_branch_access.can_view_dashboard`). The user `ysn.gaonhaetaekwondo@gmail.com` only has `employee_invoice_access`, so updates are denied.

### Solution
Add an `employee_invoice_access` check to the existing `staff_update_students` RLS policy, matching the pattern used for the INSERT policy.

### Database Migration

Replace the `staff_update_students` policy with one that also permits updates when the user has `employee_invoice_access` for the student's branch:

```sql
DROP POLICY IF EXISTS "staff_update_students" ON public.students;

CREATE POLICY "staff_update_students" ON public.students
FOR UPDATE TO authenticated
USING (
  get_current_user_role() = 'superadmin'
  OR has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = students.branch_id
  )
)
WITH CHECK (
  get_current_user_role() = 'superadmin'
  OR has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.branch_id = students.branch_id
  )
);
```

### No code changes needed
The `studentService.updateStudent()` function is correct — only the RLS policy is blocking the operation.

