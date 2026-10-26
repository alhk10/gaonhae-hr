# Clickable student names in Attendance

Make each student name in the Attendance tab open the same student profile window used in the Students tab.

## What changes
- Student names in timeslot rows, the pending requests list, and the copy-previous-week dialog become clickable (same underline-on-hover style as the Students tab).
- Clicking opens the existing student profile window (details, contacts, invoices, etc.). Closing it returns to the attendance view unchanged.
- Attended/Absent/remove buttons work exactly as before.

## Technical details
- In `src/components/attendance/AttendanceTab.tsx`, add `profileId` state, wrap `student_name` spans with the existing `StudentNameButton` (or a plain button) calling `setProfileId(b.student_id)`.
- Render the existing `StudentProfileDialog` (`studentId`, `open`, `onOpenChange`) once at the bottom. No database changes.
