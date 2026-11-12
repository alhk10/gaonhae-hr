# Fix the remaining "paid for the term" mistakes across all branches

The check behind /hello, Attendance and the grading status is already fixed. A few other screens still treat any paid class invoice as payment for the whole term. This plan brings them into line in every branch.

## Places still wrong
1. **/access Summary: paid / unpaid / no invoice counts.** A student counts as paid as soon as any current-term class invoice is paid. Part-term students like Finn and Ronan should count as **unpaid**.
2. **Branch dashboard: Grading "Term paid" number.** It counts any paid class line, so part-term students are included.
3. **Grading list "term paid" badge** (branch dashboard). It shows the invoice status, so a 3-week invoice shows "verified". It should show **partial**.
4. **Pay School Fees dialog (staff).** It hides a term once any paid or draft invoice exists, so staff can't bill Finn for the rest of Term 4. Paid part-term terms should stay selectable. Draft invoices still hide the term, to avoid duplicates.
5. **/hello remaining weeks.** It now lets a part-paid student pay again, but suggests the full 12 weeks. It should suggest only the **weeks still owed**: Finn 3, Ronan 6. The 4-week plan lock follows the same idea.

## Unchanged (as you chose)
- Part-term students can still register and pay for grading. Grading needs only some weeks paid, not the full term.

## Check after the fix
- Finn (Kembangan), Ronan, one Perth student (for example Ellie Xu) and one Bukit Merah student (Bernard Angiras) all show as partly paid on Summary, the dashboard and the grading list. /hello offers them only the remaining weeks.
- Tests cover the remaining-weeks number: Finn 3 → owes 3, Ronan 4 → owes 6, full-term 12 → owes 0.

## Technical details
- New `_term_remaining_weeks(student, term)` = max(0, required − paid).
- `get_public_chat_terms_for_student` also returns `paid_weeks` and `remaining_weeks`. `/hello` uses `remaining_weeks` as the default quantity for a part-paid term.
- `get_student_fee_plan_for_term`: unchanged for the 4-week lock. The remaining quantity comes from the new column.
- `get_access_student_payment_summary`: paid means `_term_payment_status = 'paid'`; a part-paid term counts as unpaid.
- New staff RPC `term_payment_statuses(branch, term)` (staff sign-in or branch-password gated) returns student → paid | partial | unpaid. `BranchDashboard` termPaid, `BranchGradingList` term_paid and `PaySchoolFeesDialog` paidTermIds use it, plus a per-student variant `student_term_statuses(student)`.
- `src/utils/termFullyPaid.ts`: add `remainingWeeks()` with tests.
