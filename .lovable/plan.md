## Plan

1. **Fix the booking RPC that is currently failing**
   - Redefine both `get_public_student_term_bookings` overloads.
   - Replace the incorrect `class_timetables` join with the real `branch_timetables` table.
   - Keep returning normal scheduled classes from `student_scheduled_classes`.
   - Also return direct attendance rows from `class_attendance` when no scheduled class exists for the same student/date/timetable, so Kayden’s 21/05/2026 attendance appears on the calendar.

2. **Include attendance state for existing lessons**
   - For scheduled classes, left join matching `class_attendance` so the frontend can display `present`, `absent`, or `not marked` alongside the booked slot.
   - For attendance-only rows, mark them as attendance-derived and use the attendance status directly.

3. **Make existing lesson dates clickable even if they are in the past**
   - Update the public calendar disabled-date logic so dates with existing lessons/attendance are selectable.
   - Keep past dates without lessons disabled.
   - Keep booking new slots restricted to valid term dates, non-holidays, and available future slots.

4. **Improve the lesson dialog**
   - When a user clicks a date with existing lessons, show each existing slot with:
     - time
     - class type
     - attendance status (`present`, `absent`, `not marked`, etc.)
   - Only show “tap to cancel” for cancellable scheduled lessons, not for past attended/attendance-only records.
   - Continue showing available class times for future bookable dates.

5. **Validate with Kayden’s data**
   - Confirm the RPC returns Kayden’s 21/05/2026 row.
   - Confirm the calendar shows a blue “your class” dot on 21 May and opens the dialog showing the 17:00–17:55 Kids class with attendance status `present`.