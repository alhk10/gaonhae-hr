# Auto-correct 1-day DOB drift on manual match

## Goal
When staff manually match a payment submission to a student and the submitted date of birth differs from the student's record by exactly 1 day (legacy picker drift), update the student's DOB to the submitted value automatically, with an audit log entry.

## Changes

### Database (one migration)
Update the three SECURITY DEFINER match functions — all currently only set `matched_student_id` and remember the email:

- `admin_match_grading_submission(p_id, p_student_id)`
- `admin_match_competition_submission(p_id, p_student_id)`
- `admin_match_seminar_submission(p_id, p_student_id)`

In each, after matching:

1. Read the submission's `date_of_birth` and the student's current `date_of_birth`.
2. If both are present and `abs(student.date_of_birth - submission.date_of_birth) = 1` day:
   - Update `students.date_of_birth` to the submitted date.
   - Insert a `student_change_logs` entry recording the old and new DOB (same logging pattern used by `admin_update_student_basic`).
3. If the difference is 0 or greater than 1 day, do nothing — larger differences still indicate a possible wrong match and must not silently overwrite data.

School fees (`admin_match_school_fees_submission`) is unchanged: `public_chat_payment_submissions` has no date-of-birth field, so there is nothing to correct against.

### Frontend
No UI changes needed — the correction happens inside the existing match action. The unified approvals list and matching dialogs keep working as-is.

## Verification
- Run a test match against a student whose DOB differs by 1 day and confirm the student record updates and a change-log entry appears.
- Confirm a match with a larger DOB difference leaves the student record untouched.
- Typecheck/build.
