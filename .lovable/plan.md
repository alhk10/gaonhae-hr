# Lesson request: term calendar with interactive slot cancel/reschedule

Replace the free-form date/time form on `/hello` (Schedule / Reschedule lesson stage) with an interactive term calendar tied to the matched student's branch timetable. The same calendar handles both Schedule and Reschedule modes — staff still confirms the final booking change.

## What the student sees

Header strip in the `lesson_request` stage:
- Current term name + DD/MM/YYYY date range
- "X lessons unbooked in this term" badge
- Inline legend: blue dot = your booked class, green = picked new slot, red = picked cancellation

Calendar (single month, mobile-first, restricted to term `start_date`–`end_date`):
- Disabled: dates outside term, public holidays for the branch country, weekdays with zero eligible non-full slots for this student
- Marked with a blue dot: dates where the student already has a `scheduled` class
- Marked with a small "+" indicator: dates that still have any eligible non-full slot
- Selected day picks open the slot dialog

Slot dialog (opens on date click):
- Title: full date (DD/MM/YYYY, weekday)
- Two sections:
  1. "Your booked classes that day" — each row tappable; tapping marks it red ("cancel"); tapping again un-marks. Multiple cancellations per session allowed.
  2. "Available class times" — only eligible, not-full slots for the student (age window + belt list + entitlement `class_type_scope`, minus the date+timetable rows already at `capacity`). Each row tappable; tapping marks it green ("book"); tapping again un-marks.
- "Done" closes the dialog and returns to the calendar; "Clear day" wipes that day's picks.

Picked changes persist across day-switches in two local maps:
- `cancellations: { [scheduled_class_id]: { date, start_time, end_time, timetable_id } }`
- `newBookings: { [tempId]: { date, timetable_id, start_time, end_time } }`

The calendar shows totals at the bottom (e.g. "Cancel 1 · Book 2 · Net 1 lesson"). A "Net lessons" tally cannot exceed `unbooked_count + cancellations.length` — extra new-booking attempts are blocked with a toast.

Submit button writes a single lesson-change request (see Submission). No mode selector — Schedule = picking only new slots; Reschedule = picking both a cancellation and one or more new slots. The earlier `lesson_action` Schedule/Reschedule split becomes optional and can be skipped to go straight into the calendar.

Notes textarea + Submit at the bottom. `lesson_request_done` confirmation stays the same.

## Eligibility & capacity rules

For Kayden (or any student), only show kids-class times: filter `branch_timetables` by
- `weekday` matches selected date
- student age within `[age_from, age_to]` (uses DOB from matched student)
- student current belt ∈ `belt_levels` (or `belt_levels` empty/null = open)
- timetable `class_type` ∈ union of entitlement `class_type_scope` for the active term enrollment
- slot not full: `booked_count < capacity` (booked = `student_scheduled_classes` for that date+timetable_id excluding `cancelled`/`swapped`)

A weekday becomes "disabled" on the calendar when no eligible non-full slot exists for that weekday across the term window for this student.

## Data sources (public/anon)

Public chat is unauthenticated. Add SECURITY DEFINER RPCs that take `p_session_id` and validate `public_chat_sessions.matched_student_id = p_student_id` (and branch match) before returning anything:

- `get_public_student_term_context(p_session_id, p_student_id)` → `{ term_id, term_name, start_date, end_date, sessions_total, sessions_remaining, active_scheduled_count, unbooked_count, class_type_scope[], age, current_belt, branch_id, country }`
- `get_public_branch_timetable_slots(p_session_id, p_branch_id)` → eligible active rows from `branch_timetables` filtered by age + belt + class_type_scope on the server. Each row: `{ id, weekday, start_time, end_time, class_type, capacity }`
- `get_public_student_term_bookings(p_session_id, p_student_id)` → `{ id, scheduled_date, start_time, end_time, timetable_id, status }` for the active term, excluding cancelled/swapped
- `get_public_term_slot_capacities(p_session_id, p_branch_id, p_term_id, p_timetable_ids[])` → per `(scheduled_date, timetable_id)` booked counts across the whole term, so the client can compute which (date, slot) pairs are full without per-day round-trips
- `get_public_branch_holidays(p_session_id, p_branch_id, p_from, p_to)` → list of holiday dates

All RPCs leak no PII beyond the student's own already-known data.

## Submission

Extend `SubmitLessonRequestInput`:
- `cancellations: Array<{ scheduled_class_id, date, start_time, end_time }>`
- `new_bookings: Array<{ date, timetable_id, start_time, end_time, class_type }>`
- `notes`

`submitLessonRequest` keeps using `public_chat_callback_requests` with `type='lesson_schedule_request'`. The message text lists cancellations and new bookings as DD/MM/YYYY + times so staff can apply them in the existing Approvals/Slot Booking UI. No direct write to `student_scheduled_classes` from the public page.

## Files

- `src/pages/public/PublicHelloChat.tsx` — replace `lesson_request` body. Use `@/components/ui/calendar`, `@/components/ui/dialog`, `@/utils/dateFormat` for DD/MM/YYYY. Add slot dialog + picked-changes state.
- `src/services/publicChatService.ts` — typed wrappers for the 5 RPCs and the expanded `SubmitLessonRequestInput`.
- Supabase migration — 5 SECURITY DEFINER RPCs (`set search_path = public`), each validating session→student/branch.

## Out of scope

- Direct write to `student_scheduled_classes` from public chat (still staff-approved).
- Changes to authenticated student-portal `StudentMyClassSchedule` self-booking.
- New Approvals-tab UI; existing approval row continues to surface the request text.

## Technical notes

- Active enrollment: `student_class_enrollments` for `(student_id, branch_id, status='active')`, prefer the term whose `[start_date, end_date]` contains today, else next upcoming.
- `unbooked_count = max(0, sum(entitlements.sessions_remaining for that enrollment) - count(active scheduled classes for that enrollment in term window))`.
- Eligibility filtering done server-side in the RPC to keep client payload small and avoid leaking other students' data.
- Calendar marks: extend `Calendar` `modifiers` with `booked`, `hasOpenSlot`; modifier styles use semantic tokens (no raw colors).
- Slot dialog uses `Dialog` with `max-h-[85vh]` per project mobile pattern; row buttons stack with `h-10`, picked-cancel = `bg-destructive/10 border-destructive text-destructive`, picked-new = `bg-emerald-500/10 border-emerald-600 text-emerald-700` (added as semantic tokens if missing).
- Net-lesson guard prevents over-booking past entitlement; toast explains.
