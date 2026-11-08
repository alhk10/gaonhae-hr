# Double promotion slots and grading year/term

## What changes
1. **Hidden "Double promotion" slot type** — when adding a slot in Grading Events, staff can tick "Double promotion (hidden)". These slots show in /access and the timetable but never appear in /hello.
2. **Remark column dropdown** — in the grading registrations list, the Remark column gets a dropdown with "Double testing". Choosing it moves/tags the student into the event's hidden double-promotion slot for their next belt (created automatically if missing), and keeps the original slot reference in the remark log. Clearing it returns the student to the normal slot.
3. **Year + term on grading events** — the Edit event form gets Year and Term dropdowns (from term calendars). Saved on every slot of the event; the events list shows "2026 · Term 4". Existing events are backfilled from their date and remain editable.

## Technical details
- Migration: `grading_slots` add `is_hidden boolean default false`, `slot_kind text default 'regular'` ('regular'|'double_promotion'), `grading_year int`, `term_id uuid` references `term_calendars`; backfill year/term from slot date.
- Public slot functions used by /hello filter `is_hidden = false`.
- Password-gated RPC `access_set_double_testing(p_password, registration_id, enabled)`: finds/creates the hidden slot in the same event (same date/branch, target belt = one step beyond the current slot), updates the registration's slot and remark, logs the change, respects `_access_scope`.
- UI: Grading Events dialog (slot checkbox, year/term selects) and registrations list remark dropdown; hidden slots show a "Hidden" badge in staff views.
