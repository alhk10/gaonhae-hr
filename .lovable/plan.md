# Fix: 4-week school fee shown as full-term paid (Ronan)

## What I found
- Ronan's invoice INV-202610-0115 (16/10/2026, from /hello) is a **4-week plan**: 4 x S$40 = S$160 + GST = S$174.40, verified. The line's saved details say `payment_plan: four_weeks, weeks: 4`.
- But the line text reads "Foundation to Red 1x Weekday — Term 4 2026" with the full term dates (29/09–20/12/2026), so the invoice looks like a full-term fee.
- The term fee status check (used by /hello, the Paid/Unpaid badges, Summary counts and School Fees) marks the term **paid** as soon as any class invoice for that term is paid. It never looks at the 4-week plan, so Ronan shows as paid for all of Term 4.
- His lesson pass is 4 lessons (1 used) but is valid until 20/12/2026, which is fine for lesson counts.

## Fix
1. **Term fee status understands 4-week plans.** A term counts as fully paid only when paid weeks cover the term's weeks. If only 4 weeks are paid, it shows a new **"part paid"** state (e.g. "4 of 12 weeks paid"), which counts as unpaid in Summary/School Fees and keeps the /hello "pay school fees" prompt showing the remaining weeks.
2. **Invoice wording.** 4-week lines read "Foundation to Red 1x Weekday — Term 4 2026 (4 weeks)" on screen and in the PDF, instead of looking like a full term. Applies to future invoices and fixes the wording on existing 4-week invoices (Ronan's included) without changing amounts.
3. **Check other affected students.** List every verified/paid 4-week invoice this term so you can see who else was shown as paid in full; no money is changed.
4. Add tests for the paid-weeks rule (4 of 12 weeks = part paid; 12 of 12 = paid; full-term plan = paid).

## Technical details
- Update `_term_payment_status` to sum `weeks` from line metadata for `payment_plan = 'four_weeks'` (full-term lines count as the term's total weeks) against `term_calendars` total weeks; return `'partial'` when short. Update callers (/hello lock logic in `PublicHelloChat.tsx`, `schoolFeePlan.ts`, badges, Summary metrics) to treat `partial` as not paid.
- Description suffix added where invoice items are created for fee plans (`submit_public_chat_invoice`, `PaySchoolFeesDialog`) plus a data update for existing four_weeks lines.
