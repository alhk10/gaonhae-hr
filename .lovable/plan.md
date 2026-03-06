

## Plan: Fix Attendance Auto-Population Check Constraint Error

### Root Cause

The `class_attendance` table has a check constraint (`class_attendance_attendance_method_check`) that only allows these values for `attendance_method`: `'manual'`, `'scan'`, `'app'`, `'kiosk'`.

The previous implementation used `'auto_scheduled'` which violates this constraint, causing the insert to fail with error code `23514`. This is why Abby is not showing in the Thursday attendance dialog — the auto-populate silently fails.

Ally's Friday attendance record was created manually (method: `'manual'`) so it works, but she only shows because someone already added her. The auto-populate path is broken for all students.

### Changes

#### 1. Database Migration: Update check constraint to include `'auto_scheduled'`

```sql
ALTER TABLE public.class_attendance 
DROP CONSTRAINT class_attendance_attendance_method_check;

ALTER TABLE public.class_attendance 
ADD CONSTRAINT class_attendance_attendance_method_check 
CHECK (attendance_method = ANY (ARRAY['manual', 'scan', 'app', 'kiosk', 'auto_scheduled']));
```

#### 2. No code changes needed

The code in `classAttendanceService.ts` is already correct — it uses `'auto_scheduled'` which is the right value. The constraint just needs to be updated to allow it.

### Scope
- One database migration (alter check constraint)
- No file changes

