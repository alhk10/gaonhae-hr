# Fix "column student_id does not exist" when approving a student merge

Approving a merge request on the superadmin dashboard fails with `column "student_id" does not exist`, so no merge goes through.

## Cause (confirmed)

The merge routine tries to move scheduled class records by a student column, but the scheduled-classes table has no student column — it is linked to a student through the enrolment record instead. Every approval therefore stops at that step and rolls back.

## Fix

Update the merge approval routine so it no longer touches the scheduled-classes table directly. Those records already follow the enrolments, which are moved to the kept student earlier in the same operation, so nothing is lost.

The four pending merge requests stay pending and can simply be approved again after the fix.

## Technical notes

- Migration replacing `public.approve_student_merge_request(uuid, text)`: drop the line `UPDATE student_scheduled_classes SET student_id = ... WHERE student_id = ANY(v_drop_ids);`.
- `student_scheduled_classes` columns: id, enrollment_id, timetable_id, scheduled_date, ... — relation to the student is via `student_class_enrollments.student_id`, which the function already re-points to the kept student before this step.
- All other tables referenced in the function were verified to have the columns used.
- No frontend changes needed.
