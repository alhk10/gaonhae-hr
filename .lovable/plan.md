# Fix: Skye shows "paid" for Term 4 after paying only 4 weeks

## What's wrong
Skye Jasmine Whisby (Kembangan) has one Term 4 invoice, INV-202611-0040, for 4 weeks. It was issued on 14/11/2026. Term 4 runs from 29/09 to 20/12.

The system treats anyone whose first term invoice comes after the term starts as a "late joiner". For late joiners, paid weeks are counted from the invoice date instead of from the term start. So Skye's 4 weeks are counted as 14/11 to 11/12. Today (17/11) falls inside that span, so she shows as paid.

But Skye isn't a new student. She has been with us since June 2026 and has paid invoices from earlier terms. Her 4 weeks should count from the term start (29/09 to 26/10), which means she should show as **unpaid / part-paid** now.

## The fix
- Count from the invoice date only for real new joiners: students who joined after the term started and have no class invoice from an earlier term.
- Returning students like Skye always count from the term start. That puts her October-only payment at 29/09 to 26/10, and she shows as owing the remaining weeks.
- Apply the same rule on the Students tab, Attendance, grading readiness, /hello and the monthly counts, so every page agrees.

## Check
- Skye shows as part-paid (4 of 12 weeks, covered until 26/10).
- A genuine new student who joins mid-term still counts from their first invoice date.

## Technical details
- Migration: in `_term_coverage`, set `v_late` only when `v_first > t.start_date` AND the student has no paid/verified Classes invoice issued before `t.start_date` AND `students.created_at::date > t.start_date`. Use `v_from := t.start_date` when not late.
- Mirror the same condition in `termCoverage` in `src/utils/termFullyPaid.ts` and any callers that pass first-invoice dates.
- Update the AGENTS.md term-coverage rule to say "a new joiner's first invoice date".
