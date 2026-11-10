# Attendance "Calendar as Term" view

## What you'll see
- New switch in Attendance Settings: **Calendar as Term**. Turned on by default for Carpe Diem Stradia, off for other branches.
- When on, the Attendance tab shows the whole term as a grid instead of one day at a time:
  - One section per class time (e.g. 12:00–12:30, 12:30–13:15).
  - Student names down the left, with their badges beside the name (belt, Ready for grading, Progress card, payment badges unless muted).
  - Term lesson dates across the top (only days that class runs, public holidays skipped). Today's column highlighted.
  - Each cell is the same Present/Absent toggle as now (green Present, red Absent, blank if the student isn't booked that date).
  - Grid scrolls sideways with the name column fixed in place.
- Report button and Settings stay where they are. The day-by-day navigation is hidden while the term view is on; a term picker replaces it.
- View-only password (Hp87783395) sees the grid but cannot toggle cells, same as today.

## Technical details
- Add a `calendar_as_term` boolean to the branch attendance settings (same place as the mute-unpaid switch), default false; set true for Carpe Diem Stradia. Expose through the existing settings read/save RPCs (all-branch / branch-scope checks unchanged).
- `AttendanceTab.tsx`: when the flag is on, load bookings for the whole selected term via the existing week/range RPC and render a new `AttendanceTermGrid` component reusing the existing toggle, badges and student-profile click handlers.
- `AttendanceSettingsDialog.tsx`: add the switch.
