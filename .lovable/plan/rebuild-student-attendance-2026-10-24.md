# Rebuild student attendance

## What gets removed (permanently)
- All student class booking and attendance records: 191 attendance marks, 43 booked classes, 6 class enrolments. This deletion cannot be undone.
- Old screens: student portal My Classes, the branch dashboard student timetable, reschedule and attendance-history dialogs, the old student-class services, and auto-booking from invoices.
- What stays: staff clock-in attendance and payroll (a separate system), the 78 branch timetable slots, the 24 terms, and paid-lesson balances from invoices.

## New Attendance tab in /access (after Students)
- A week view that starts on Monday, with previous/next week and Today buttons. Days with no lessons (and public holidays) are hidden.
- Each day lists its timeslots: time, class, age and belt range, and how many students are booked out of the capacity.
- In each timeslot, staff search the branch's students and add them. Each student has **Attended** and **Absent** buttons and a remove button.
- Staff can add students freely. If a student has used up their paid lessons for the term, a prompt asks staff to confirm before adding.
- Pending requests from /hello appear at the top with Approve and Reject buttons.
- Branch-locked staff see only their own branch, using the existing branch switcher.

## Settings button
- **Timetable**: add, edit or turn off weekly slots (day, start and end time, class, age, belts, capacity, instructor).
- **Classes**: manage the class types used by the slots.
- **Terms**: edit term names, start and end dates, and breaks (reuses the existing terms).

## /hello: Book a class
- Recognised students see upcoming slots for their branch that match their age and belt within the current term, and send a booking request.
- Students can only book within their remaining paid lessons; once the limit is reached, booking is blocked with a message.
- The request shows as pending until staff approve it. Approved bookings appear in the timeslot.
- Marking Attended or Absent uses one paid lesson. Removing a booking or rejecting a request uses none.

## Technical
- Migration: drop `class_attendance`, `student_scheduled_classes`, `student_class_enrollments` plus their dependent triggers and functions (including the invoice auto-enrolment and lesson-attendance fixup). Keep `attendance` (staff), `branch_timetables`, `term_calendars`, `term_breaks`, `entitlements`.
- New `lesson_bookings` table (student_id, timetable_id, branch_id, lesson_date, term_id, status `requested|booked|attended|absent|rejected`, source `staff|hello`, approved_by, marked_at), with a unique (student_id, timetable_id, lesson_date). RLS: authenticated staff; anon access only through SECURITY DEFINER RPCs.
- RPCs: `access_attendance_week(session, branch, week_start)`, `access_attendance_add/mark/remove/approve`, `access_timetable_upsert`, `access_term_upsert` (validated `/access` session and `_scope_has` branch check); `hello_list_bookable_slots` and `hello_request_booking` (validated chat session, with the entitlement remaining check).
- Lesson usage: `entitlements.sessions_used` is recalculated from attended and absent bookings by a trigger.
- UI: new `AttendanceTab.tsx` and `AttendanceSettingsDialog.tsx`, wired into `PublicGradingList.tsx` after Students; `/hello` booking added in `PublicHelloChat.tsx`. Remove old components and imports, and clean up payroll, invoice and student services that reference the dropped tables.
- Tests: the term-limit prompt, the hello limit block, and attended/absent each using exactly one lesson.
- Record the decision in `AGENTS.md`.
