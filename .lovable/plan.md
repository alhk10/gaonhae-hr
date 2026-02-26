

## Fix: Sulis Cannot See Yishun Students

### Root Cause
The `students` table has RLS enabled with only two SELECT policies:
1. `students_view_own_record` — allows students to see their own record
2. `superadmin_manage_students` — allows superadmins full access

Sulis is an employee with invoice access to Yishun (via `employee_invoice_access` table), but there is **no RLS policy** that grants employees with invoice access the ability to SELECT students from their accessible branches. This affects both the Branch tab's BranchDashboard and the Students tab's EmployeeBranchStudentList.

### Fix: Add RLS Policy on `students` Table

Create a new SELECT policy that allows authenticated users who have `employee_invoice_access` records to view students from the branches they have access to:

```sql
CREATE POLICY "employees_with_invoice_access_view_branch_students"
  ON public.students
  FOR SELECT
  USING (
    branch_id IN (
      SELECT eia.branch_id 
      FROM public.employee_invoice_access eia
      JOIN public.employees e ON eia.employee_id = e.id
      WHERE e.email = auth.email()
    )
  );
```

This single migration is the only change needed. No code changes required — the existing queries in `EmployeeBranchStudentList` and `BranchDashboard` already filter by `branch_id`, they just get empty results due to RLS blocking.

