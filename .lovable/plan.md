

## Plan: Show Attendance-Based Students in Timetable + Verify Ad-Hoc Invoice

### Problem Analysis

Two separate issues:

**Issue 1: Ally not showing in Friday 3:30pm timetable slot**
The timetable view (`BranchWeeklyTimetable.tsx`) only displays students from `student_scheduled_classes` (enrollment-based). Ally was added manually via the attendance dialog, creating a `class_attendance` record but no `student_scheduled_class` entry. The timetable doesn't read `class_attendance` data, so she shows as "No students."

**Issue 2: Ad-hoc invoice**
An ad-hoc invoice **was** actually created (ID: `1a7a0584-7cbd-4179-9b8f-2eea2d42321b`, status: draft). It may not have been visible at the time the user checked. No code change needed here.

### Solution

Merge `class_attendance` records into the timetable display so students added via attendance (manually or ad-hoc) also appear under their slot.

### Changes

#### 1. New service function: `getAttendanceForWeek` in `classAttendanceService.ts`

Add a function that fetches all `class_attendance` records for a branch within a date range, joining student names. Returns records grouped by `timetable_id + class_date`.

#### 2. Update `BranchWeeklyTimetable.tsx`

- Fetch attendance records for the week using the new function
- In the `groupedByDay` memo, after mapping `student_scheduled_classes` into `slot.students`, also merge in any students from `class_attendance` who aren't already in the list
- This ensures manually-added students (like Ally) appear in the timetable view with their names

### Scope
- `src/services/classAttendanceService.ts` — add `getAttendanceForWeek` function
- `src/components/dashboard/BranchWeeklyTimetable.tsx` — fetch and merge attendance data into slot students

