# Let staff decide on students over their lesson limit when copying

## Problem
**Copy from previous session** skips every student who has used up their term lessons, then shows "skipped (lesson limit)". Adding one student at a time already asks "Add anyway?", but copying never asks.

## Change (Attendance tab only)
1. When copying, add every student who still has lessons left, as now.
2. Collect the students who hit the lesson limit. Don't drop them. Open one dialog that lists them, showing each student's unused and already-booked lessons.
3. Each student has a checkbox, all ticked by default, plus these buttons:
   - **Add selected anyway**: adds the ticked students using the existing override, the same one "Add anyway" uses today.
   - **Skip all**: adds none of them.
4. The final message reports how many were added normally, how many were added over the limit, and how many were skipped. Students skipped because the class is full are still reported as full.

## Technical details
- `src/components/attendance/AttendanceTab.tsx`: `doCopy` collects `limit_reached` results (with `remaining`/`pending`) into new state `overLimitPrompt`. A new AlertDialog with checkboxes calls `addStudentToSlot(slot, date, id, true)` for the ticked students.
- No database change. The force/override path already exists, and attendance charging stays unchanged: the lesson balance can go negative, the same as with today's single "Add anyway".
