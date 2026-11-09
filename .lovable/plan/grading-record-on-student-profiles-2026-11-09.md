# Grading Record on student profiles

## What's wrong
Pass results set in the Grading tab are saved on the grading entry only. Nothing writes them to the student's grading history, which is what the profile's "Grading" section reads. The history is empty for every student, even though 231 entries are marked Pass/Double.

## Fix
1. Automatically add a grading record whenever an entry's result is set to **Pass** or **Double**. The record holds the date, belt from, belt to, result and branch. Changing the result away from Pass/Double removes that record, and changing it again updates the same record instead of adding a duplicate.
   - For **Double**, the record shows the second promotion (e.g. Foundation 2 → Foundation 4).
2. Backfill the 231 existing Pass/Double entries, including Coco Kuo (08/10/2026, Foundation 2 → Foundation 3).
3. The profile's Grading section then lists them, newest first. No screen changes are needed.

## Note (not changed)
Coco's profile belt still shows **White**. Passing a grading does not currently update the belt. Tell me if you want passing to also update the student's belt automatically.

## Technical details
- Add `grading_registration_id uuid unique` to `student_grading_history` (nullable, FK on delete cascade).
- AFTER INSERT/UPDATE OF result trigger on `grading_registrations`: upsert on pass/double using slot date and branch, delete otherwise. Existing `_grading_history_dan_date` trigger keeps working on these inserts.
- One-time backfill insert from existing pass/double registrations.
