

## Plan: Auto-populate Attendance from Scheduled Students

### Problem
When opening the attendance dialog for a slot (e.g., Kids 3:30 PM Thursday), it queries the `class_attendance` table which is empty. Abby is in `student_scheduled_classes` but not in `class_attendance`, so she doesn't appear. Additionally, all scheduled students should default to "present" (checked).

### Root Cause
The `SlotAttendanceDialog` only reads from `class_attendance`. There's no logic to seed attendance records from `student_scheduled_classes` when the dialog opens.

### Changes

**File: `src/services/classAttendanceService.ts`**
- Add a new function `autoPopulateAttendanceFromSchedule(branchId, timetableId, date)` that:
  1. Queries `student_scheduled_classes` for that `timetable_id` and `scheduled_date`, joined with enrollments to get `student_id` and filter by `branch_id`
  2. Checks which students already have `class_attendance` records
  3. For any scheduled student without an attendance record, inserts a `class_attendance` record with `status = 'present'`

**File: `src/components/dashboard/SlotAttendanceDialog.tsx`**
- Before fetching attendance, call `autoPopulateAttendanceFromSchedule` to seed records from scheduled classes
- This can be done inside the `queryFn` of the attendance query: call auto-populate first, then fetch attendance as before
- This ensures that every time the dialog opens, scheduled students are automatically added with "present" status

### Behavior
- When a slot is clicked, scheduled students appear immediately in the Attendance tab with "present" checked
- Staff can still toggle to "absent" or remove students
- Staff can still add non-scheduled students via the "Add Students" tab
- Existing attendance records are not overwritten (only missing ones are created)

