# Part-term payments: paid for the weeks covered, grading after 50% of the term

## New rules
- **Paid for the period covered.** Weeks paid count forward from the first day covered: the term start, or the first invoice date for students who joined late. A student is **paid** while today falls in those weeks, then **unpaid** after that.
  - Ronan, 4 weeks from 29/09: paid until about 26/10, then unpaid.
  - Finn, 3 weeks from 11/11: paid until 01/12, then unpaid.
- Paying for the whole term (or for every remaining week) shows as paid until the term ends.
- **Grading:** a student can register and pay for grading once they have paid at least **50% of the term's weeks** (for example 6 of 12).
- **Late joiners are exempt.** A student whose first class invoice for the term is dated after the term started can grade once any weeks are paid.
- /hello and the staff Pay School Fees dialog suggest only the **weeks still owed** for the term.

## Where it applies (all branches)
1. /hello: school fee options, the outstanding-fees prompt and grading registration.
2. /access Attendance unpaid badges, Grading paid badges and Summary paid / unpaid / no-invoice counts.
3. Branch dashboard: Grading "Term paid" count and the grading list "term paid" badge (paid or partial).
4. Staff Pay School Fees dialog: terms that are only partly paid stay selectable. Drafts still hide the term, to avoid duplicates.
5. Staff Pay Grading dialog: needs 50% of the term paid, with late joiners exempt. Grading billed on the same invoice as the fees still goes through.

## Check after the fix
- Finn shows paid today, is offered 3 more weeks, and can register for grading because he joined late.
- Ronan shows unpaid today and is offered 6 more weeks. With 4 of 12 weeks paid, he can't register for grading yet.
- Tests: covered-until date, paid/unpaid by today's date, remaining weeks, the 50% threshold and the late-joiner exemption.

## Technical details
- `_term_coverage(student, term)` returns paid_weeks, required_weeks, covered_from, covered_until = covered_from + paid_weeks*7 − 1 (capped at term end), remaining_weeks, is_late_joiner (first paid class invoice issue_date > term start), and grading_eligible = (is_late_joiner AND paid_weeks > 0) OR paid_weeks ≥ CEIL(total_weeks × 0.5).
- `_term_payment_status`: 'paid' when fully paid or CURRENT_DATE ≤ covered_until; otherwise 'unpaid'; 'none' unchanged.
- `get_public_chat_terms_for_student` adds `paid_weeks`, `remaining_weeks` and `covered_until`. `is_paid` means fully paid, so the term stays payable until it's fully covered.
- The /hello grading prerequisite and the PayGradingDialog / submit paths check `grading_eligible`.
- `get_access_student_payment_summary` uses `_term_payment_status`.
- New staff RPC `term_payment_statuses(branch, term)` (staff sign-in or branch password) is used by BranchDashboard, BranchGradingList and PaySchoolFeesDialog.
- Mirror in `src/utils/termFullyPaid.ts` (`termCoverage`), with tests. Update the AGENTS.md rule and save the grading rule to memory.
