# Fix: Finn shown as "paid for the term" after paying only part of it

## What we found
- Finn (GUANG ZHENG FINN LAI, Kembangan) has one Term 4 2026 class invoice: **INV-202611-0021**, created by staff in /access on 11/11/2026. It's "Foundation to Red 3x Weekend", **qty 3 x S$65** less S$20, plus GST = S$190.75, and it's verified.
- Term 4 has 12 weeks (29/09 to 20/12), so 3 weeks doesn't cover the term.
- Yesterday's fix only spots part-term payments when the line is tagged as the /hello "4 weeks" plan. Staff-made invoices don't get that tag, so any paid class line still counts as the full term. That's why /hello shows "All terms paid" on every class option, and the invoice looks like it covers the term.
- This also affects other staff-made class invoices: Term 4 has paid lines with quantities from 1 to 10 that count as full-term today.

## The new rule
- A class line covers **its quantity in weeks** (the 4-week plan stays at 4 weeks).
- A term counts as fully paid when the paid weeks cover the weeks that were **left in the term on the first invoice date**. Students who joined late and paid the rest of the term stay paid. Students who paid only part of it, like Finn, show the rest as due.
- Staff can still make an exception by billing the full number of weeks.

## Changes
1. Update the shared database check behind /hello, Attendance, Grading, Summary and School Fees to use the rule above. The matching check in the app gets the same update.
2. Invoice lines and PDFs for class items covering fewer weeks than the term will end in "(N weeks)". No amounts change.
3. Add tests: Finn's case (3 of 12 weeks counts as not paid), a late joiner paying all remaining weeks counts as paid, and 4-week payments still add up.
4. List every student whose Term 4 status changes from paid to unpaid, so you can review them before families see the prompt.

## Technical details
- `_term_paid_weeks`: sum `quantity` (or `metadata.weeks`, or 4 for `four_weeks`) for each line, instead of 1000.
- Required weeks = `CEIL((end_date - GREATEST(start_date, earliest paid class invoice issue_date) + 1) / 7)`, capped at `total_weeks`. Used in `_term_payment_status` and `get_public_chat_terms_for_student`, and mirrored in `src/utils/termFullyPaid.ts`.
- Update the AGENTS.md term-paid rule.
