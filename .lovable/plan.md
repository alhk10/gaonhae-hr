# Pass updates the student's belt

## From now on
- When a grading result is set to **Pass** or **Double**, the student's belt changes to the grading's target belt (e.g. Coco: Foundation 3).
- If the result is changed back (Fail / cleared), the belt reverts to the grading's starting belt, but only if nobody has changed the belt since.
- An older grading never overwrites a newer belt. The belt only updates when this is the student's most recent passed grading.

## Existing students (one-time fix)
For each student, take their most recent Pass/Double grading and set their belt to its target belt. This only happens if their current belt is empty, White, or still the belt they graded from, so belts staff changed by hand are left alone. Coco Kuo moves from White to Foundation 3. I'll report how many students changed.

## Technical details
- Extend `_grading_reg_sync_history` trigger: on pass/double, if no later-dated pass exists for the student, `UPDATE students SET current_belt = NEW.target_belt`. On un-pass, revert only when `students.current_belt = OLD.target_belt`.
- Backfill with `DISTINCT ON (student_id) ORDER BY grading_date DESC`, with the guard above.
- Existing student change logs/triggers on `students` still fire.
