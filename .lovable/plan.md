# Backfill 1-day DOB drift using majority vote

## Goal
Correct student dates of birth that are off by 1 day, based on past matched payment submissions — the date supported by the majority of a student's submissions wins.

## Data found
- 66 students have at least one matched submission whose DOB differs from the student record by exactly 1 day (56 grading, 2 competition, 10 seminar).
- 52 of them have mixed evidence (submissions supporting both dates).

## Change (one data migration via run of SQL update — executed as a data operation)

For each affected student:

1. Gather all matched submission DOBs across grading, competition, and seminar payments (the student's current record counts as one vote too, so a 1-vs-1 tie does not flip the record).
2. Count votes per date.
3. If the student record's current DOB is NOT the strict majority winner and a single other date (exactly 1 day away) holds the strict majority:
   - Update `students.date_of_birth` to the majority date.
   - Insert a `student_change_logs` entry (`field_name='date_of_birth'`, old/new values, `changed_by='majority_dob_backfill'`).
4. Ties (no strict majority) are left untouched and reported back as a list for manual review.

Nothing else changes — no invoices, submissions, or enrollments are touched. School-fee payments are excluded (no DOB collected).

## Verification
- Report how many records were updated and list any tie cases skipped.
- Spot-check a few updated students against their submission history.
