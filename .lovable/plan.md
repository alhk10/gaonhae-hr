# Attendance: copy last week's students + unpaid term warning

## 1. "Copy last week" button per timeslot
- Each timeslot gets its own **Copy last week** button next to Add student.
- It copies only the students booked in that timeslot on the same weekday 7 days earlier. Other timeslots are not touched.
- Skips students already in the slot, withdrawn/inactive students, slots now full, and dates that are public holidays or term breaks.
- Rejected bookings are not copied. Attended/absent/booked are copied as fresh "booked".
- Confirmation dialog first: "Copy X students from Tuesday 20/10/2026?" then a result toast: "Added X, skipped Y (already added / full / lesson limit)".
- Students out of term lessons are skipped and listed, not force-added.

## 2. Unpaid term warning dialog
- When staff add a student (Add student or Copy last week) who has an **Unpaid** or **No invoice** term status (non-trial), show a warning dialog: "NAME has not paid for this term. Add anyway?" with Cancel / Add anyway.
- For Copy last week, one dialog lists all unpaid students with checkboxes (default on) so staff can exclude any before copying.
- Marking Attended on an unpaid student also shows the same warning once.

## Technical
- New password-gated RPC `access_attendance_copy_previous(p_password, p_date, p_student_ids uuid[] default null)` returning added/skipped lists; reuses `access_attendance_add` rules (entitlement limit, capacity, holidays).
- Preview RPC `access_attendance_copy_preview(p_password, p_date)` returning candidate students per slot with term payment status (reuse existing term-payment helper `_term_payment_status`).
- `searchAttendanceStudents` results include term_payment so the add dialog can warn before calling add.
- Small test for the "skip already-added / non-active" selection rule.
