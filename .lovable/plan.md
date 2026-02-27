

## Root Cause: Missing RLS Policies on `students` Table

The `students` table has Row Level Security (RLS) enabled but only one policy exists: a SELECT policy (`employees_with_invoice_access_view_branch_students`). There are **no UPDATE, INSERT, or DELETE policies**, so all write operations are silently rejected by Postgres with "row-level security policy" violations.

This affects all student mutations — editing, creating, and deleting students.

## Fix

Create a SQL migration adding the missing RLS policies:

1. **UPDATE policy** — Allow superadmins, employees with admin/sales access, and students updating their own record
2. **INSERT policy** — Allow superadmins and employees with admin/sales access
3. **DELETE policy** — Allow superadmins only

Policies will use existing helper functions (`get_current_user_role()`, `has_sales_access()`, `is_student()`, `get_current_student_id()`) for consistency.

### Migration SQL

```sql
-- Allow superadmins and sales-access employees to update any student
CREATE POLICY "staff_update_students"
  ON public.students FOR UPDATE
  USING (get_current_user_role() = 'superadmin' OR has_sales_access())
  WITH CHECK (get_current_user_role() = 'superadmin' OR has_sales_access());

-- Allow students to update their own record (student portal)
CREATE POLICY "students_update_own"
  ON public.students FOR UPDATE
  USING (is_student() AND id = get_current_student_id())
  WITH CHECK (is_student() AND id = get_current_student_id());

-- Allow superadmins and sales-access employees to insert students
CREATE POLICY "staff_insert_students"
  ON public.students FOR INSERT
  WITH CHECK (get_current_user_role() = 'superadmin' OR has_sales_access());

-- Allow superadmins to delete students
CREATE POLICY "superadmin_delete_students"
  ON public.students FOR DELETE
  USING (get_current_user_role() = 'superadmin');
```

### Secondary Fix: `gender` constraint vs form option

The `students_gender_check` constraint allows only `'male'`, `'female'`, `'other'` — but the Edit form includes `'prefer-not-to-say'` as a gender option. This will also cause failures if selected. The form option should be removed or the constraint updated. The simpler fix is to remove the `'prefer-not-to-say'` option from the `EditStudentDialog` and `AddStudentDialog` gender selects.

