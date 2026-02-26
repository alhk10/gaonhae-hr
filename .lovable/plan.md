

## Fix: Student Deletion Blocked by Foreign Key Constraints

### Root Cause
Two tables have foreign keys to `students` with `NO ACTION` delete rule, which prevents deletion when related records exist:
- `invoices.student_id` → `NO ACTION`
- `class_attendance.student_id` → `NO ACTION`

All other child tables already have `CASCADE`.

### Solution: Database Migration

Run a migration to change both foreign keys to `CASCADE`, so deleting a student automatically removes their invoices and attendance records.

```sql
-- Fix invoices FK
ALTER TABLE public.invoices
  DROP CONSTRAINT invoices_student_id_fkey;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- Fix class_attendance FK
ALTER TABLE public.class_attendance
  DROP CONSTRAINT class_attendance_student_id_fkey;
ALTER TABLE public.class_attendance
  ADD CONSTRAINT class_attendance_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
```

Also check if `grading_deletion_requests` has a FK (it has `student_id` column but wasn't in the FK list — may be unlinked text reference, no action needed).

### Files to Modify
| File | Change |
|---|---|
| Database migration | Update FK constraints on `invoices` and `class_attendance` to `ON DELETE CASCADE` |

No application code changes needed — the existing `deleteStudent` and `bulkDeleteStudents` functions will work once the DB constraints are fixed.

