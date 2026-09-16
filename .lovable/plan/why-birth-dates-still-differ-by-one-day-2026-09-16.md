# Why birth dates still differ by one day

## What the data shows

The public forms are no longer the problem. Their date-of-birth field is already three
dropdowns (day / month / year) and saves the exact calendar date chosen — a different input
design would not change anything.

The remaining mismatches come from the **student records themselves**, which were created
during the period when the old forms saved one day early:

- Of the submissions received since 11 September (after the write fix), 28 agree with the
  student record and 25 are exactly one day later than it.
- Every one of those 25 belongs to a student record created in June or July 2026
  (batches of 23/06, 29/06, 09/06, 14/07 and neighbours).
- Students created in September match perfectly (18 of 18 on 14/09).

So parents are now entering the correct date, and it is the older student record that is a
day early. The earlier clean-up in September corrected the submissions to match the student
records — the wrong side — which is why the difference reappears on every new payment.

## What will be done

1. **Audit the student records, not the submissions.**
   For every student, gather all independent evidence of their birth date: submissions
   received after 11 September, registration form entries, and any later staff edit. Group by
   student and flag those where the evidence consistently says one day later than the stored
   record.

2. **Produce a review list before changing anything.**
   A downloadable list per student: stored date, each piece of evidence with its date and
   source, and the proposed corrected date. Anything ambiguous (conflicting evidence, single
   weak source) is listed for staff to decide, not auto-corrected.

3. **Apply the correction in one pass** to the students where the evidence agrees, then
   re-run the audit to confirm the remaining count is zero. Records already corrected are
   left alone.

4. **Stop matching from being derailed meanwhile.** Treat a one-day birth-date difference as
   a soft warning rather than a contradiction, so a submission from a known family still
   surfaces the right student as a suggestion while the data is being cleaned.

5. **No change to the date-of-birth input.** The dropdown picker is already timezone-safe on
   all public forms and the Hello chat. The only UI addition worth making is showing the
   chosen date back to the person as DD/MM/YYYY on the review step before they submit, so a
   genuine typo is caught by the parent.

## Technical notes

- Evidence sources: `grading_payment_submissions`, `competition_payment_submissions`,
  `seminar_payment_submissions`, `guards_purchases` (rows with `created_at > 2026-09-11`),
  plus `student_registrations`, joined on `matched_student_id`.
- Correction predicate: student is updated only when every post-fix evidence row for that
  student agrees on the same date and that date is exactly `students.date_of_birth + 1`.
- CSV snapshot of the before/after values written to `/mnt/documents/` prior to the update.
- Matching change in `src/utils/submissionMatchConfidence.ts`: one-day DOB delta becomes a
  score penalty instead of a hard `matchContradiction`.
- No schema changes; data-only update plus the review export.
