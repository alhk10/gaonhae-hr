# Part-term payments: paid for the weeks covered, grading after 6 weeks

## New rules
- **Paid for the period covered.** Weeks paid count forward from the first day covered: the term start, or the first invoice date for students who joined late. A student is **paid** while today falls in those weeks, then **unpaid** after that.
  - Ronan, 4 weeks from 29/09: paid until about 26/10, then unpaid.
  - Finn, 3 weeks from 11/11: paid until 01/12, then unpaid.
- Paying for the whole term (or for every remaining week) shows as paid until the term ends.
- **Grading:** a student can register and pay for grading once they have paid at least **6 weeks** of that term. A late joiner who paid every remaining week also qualifies, even if that's fewer than 6.
- /hello and the staff Pay School Fees dialog suggest only the **weeks still owed** for the term.

## Where it applies (all branches)
1. /hello: school fee options, the outstanding-fees prompt and grading registration.
2. /access Attendance unpaid badges, Grading paid badges and Summary paid / unpaid / no-invoice counts.
3. Branch dashboard: Grading "Term paid" count and the grading list "term paid" badge (paid or partial).
4. Staff Pay School Fees dialog: terms that are only partly paid stay selectable. Drafts still hide the term, to avoid duplicates.
5. Staff Pay Grading dialog: needs 6+ paid weeks, unless the grading is billed on the same invoice as the fees (that exception stays).

## Check after the fix
- Finn shows paid today and is offered 3 more weeks. Ronan shows unpaid today and is offered 6 more weeks; with 4 weeks paid, he can't register for grading.
- Tests: covered-until date, paid/unpaid by today's date, remaining weeks, and the 6-week grading threshold.

## Technical details
- `_term_coverage(student, term)` returns paid_weeks, required_weeks, covered_from, covered_until = covered_from + paid_weeks*7 − 1 (capped at term end), remaining_weeks and grading_eligible (paid_weeks ≥ LEAST(6, required_weeks)).
- `_term_payment_status`: 'paid' when fully paid or CURRENT_DATE ≤ covered_until; otherwise 'unpaid'; 'none' unchanged.
- `get_public_chat_terms_for_student` adds `paid_weeks`, `remaining_weeks` and `covered_until`. `is_paid` means fully paid, so the term stays payable until it's fully covered.
- The /hello grading prerequisite and the PayGradingDialog / submit paths check `grading_eligible`.
- `get_access_student_payment_summary` uses `_term_payment_status`.
- New staff RPC `term_payment_statuses(branch, term)` (staff sign-in or branch password) is used by BranchDashboard, BranchGradingList and PaySchoolFeesDialog.
- Mirror in `src/utils/termFullyPaid.ts` (`termCoverage`), with tests. Update the AGENTS.md rule and save the 6-week grading rule to memory.
