

## Problem

`ysn.gaonhaetaekwondo@gmail.com` cannot add students because the `students` table INSERT RLS policy requires `has_sales_access()`, which only checks `employee_branch_access.can_view_dashboard`. This user only has `employee_invoice_access` (with `can_create: true` for Yishun branch) but no `employee_branch_access` record, so the insert is denied.

## Solution

Add a new INSERT RLS policy (or update the existing one) to also allow employees with `employee_invoice_access` who have `can_create = true` to insert students into their authorized branches.

## Changes

### 1. Database Migration

Update the `staff_insert_students` policy to also permit users with `employee_invoice_access` where `can_create = true`:

```sql
DROP POLICY IF EXISTS "staff_insert_students" ON public.students;

CREATE POLICY "staff_insert_students"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_role() = 'superadmin'
  OR has_sales_access()
  OR EXISTS (
    SELECT 1 FROM employee_invoice_access eia
    JOIN employees e ON eia.employee_id = e.id
    WHERE e.email = auth.email()
    AND eia.can_create = true
    AND eia.branch_id = branch_id
  )
);
```

This grants insert permission when the user has invoice access with `can_create` for the student's branch, matching the intent of giving this user the ability to manage students from the branch dashboard.

### No code changes needed
The `AddStudentDialog` and `studentService.createStudent` logic is correct — only the RLS policy is blocking the operation.

