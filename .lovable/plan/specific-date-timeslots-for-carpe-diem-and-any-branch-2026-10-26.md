# Specific-date timeslots (for Carpe Diem and any branch)

## What changes
Today every timeslot repeats weekly. A new **Repeat** choice in Attendance Settings → Timetable will offer:
- **Weekly** (current behaviour): pick a day.
- **Specific dates**: pick one or more calendar dates (DD/MM/YYYY), plus start and end time, class, capacity, ages, belts and instructor as usual.

With Specific dates:
- The slot shows only on those exact dates in the Attendance day view. Weekly slots on the same day still show.
- The timetable list shows those slots as "Specific dates: 03/11/2026, 10/11/2026 …" next to the weekly slots.
- Public holidays and term breaks still hide the slot. If a chosen date falls on one, a warning shows while saving.
- Adding students, copying last week's students, marking attendance and `/hello` lesson requests work the same way. Copy-previous-week copies from the previous dated session of the same slot.
- Any branch can use this. Carpe Diem can use only dated slots and skip weekly ones.

## Technical details
- Migration: `branch_timetables.specific_dates date[]` (null = weekly). Make `weekday` nullable. A validation trigger requires either a weekday or at least one date.
- Update `access_timetable_upsert` to accept `p_specific_dates`. Update `access_attendance_week` and `hello_submit_lesson_request` to match slots with `weekday = dow OR date = ANY(specific_dates)`.
- Settings dialog: Weekly / Specific dates toggle, plus a multi-select shadcn Calendar shown as DD/MM/YYYY chips.
- Update `visibleDays` / week helpers for dated slots and add tests: a dated slot appears only on its dates, and weekly slots are unchanged.
