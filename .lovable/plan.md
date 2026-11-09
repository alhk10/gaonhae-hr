# Grading tab: term badge follows the grading's own term

Right now the term badge on Grading rows shows each student's current-term payment. Change it so each row shows the payment status for the term the grading belongs to. For example, the 08/10/2026 grading would show Term 3 status.

## What you'll see
- The badge reads e.g. **T3 paid**, **T3 unpaid $X**, **T3 no invoice**, or **Trial**, with the same colours as now.
- **Ready for grading** / **Grading paid** are also checked against that same term.

## How the term is picked
1. The year/term tag on the grading event, if it has one.
2. If not, the term whose dates include the grading date at the student's branch.

## Technical details
- New read-only database function `access_grading_term_status(p_grading_date date, p_branch_id text)`. It returns one row per student in that grading: term id/name, class-fee invoice status and balance for that term (cancelled/refunded/void excluded, same rules as the Students tab), and the ready flag from `_grading_ready_state`.
- `PublicGradingList.tsx` drops the current-term student lookup and queries this function per grading date shown, then maps results by student.
- No changes to data, invoices or payments.
