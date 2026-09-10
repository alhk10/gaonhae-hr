# Correct birth dates saved one day early

## What will change

For records where the submitted birth date is exactly one day before the birth date on the
matched student record, the submitted date is corrected to match the student record.

Scope, based on the audit already run:

- 71 grading payment submissions
- 3 uniforms & guards purchases
- 0 school fees submissions (nothing to do)

Only rows that are matched to a student are touched. Rows with no matched student are left
alone, because there is nothing reliable to compare against.

## Safety steps

1. Before changing anything, export the affected rows (id, name, current birth date, student's
   birth date) to a file you can keep as a record.
2. Apply the correction in a single pass, restricted to rows that are still exactly one day
   earlier at the moment of the update.
3. Re-run the audit afterwards to confirm the count is zero.

## What is not included

- No changes to unmatched submissions.
- No changes to the students table itself.
- No changes to any date other than the birth date on those submissions.

## Technical notes

- Data-only change via `run_sql`, no schema or RPC changes.
- Update predicate: `submission.date_of_birth = student.date_of_birth - interval '1 day'`,
  joined on the existing matched-student column for each table
  (`grading_payment_submissions`, `guards_purchases`).
- CSV snapshot written to `/mnt/documents/` before the update.
