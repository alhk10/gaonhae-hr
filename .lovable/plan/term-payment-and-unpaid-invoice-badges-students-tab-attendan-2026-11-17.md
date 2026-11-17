# Term payment and unpaid invoice badges (Students tab + Attendance)

## What changes
Every student row on the /access Students tab and the Attendance tab shows up to two badges.

**1. Term payment badge** (for the term being viewed; trial students keep the amber "Trial" badge)
| Situation | Badge | Colour |
|---|---|---|
| No term invoice for this term | No Term Invoice | Red |
| Term invoice unpaid, invoice dated more than 1 month ago | Unpaid Term Invoice | Red |
| Term invoice unpaid, invoice dated 1 month ago or less | Unpaid Term Invoice | Amber |
| Term covered (same paid rule used everywhere today) | Term Paid | Green |

**2. Unpaid invoice badge** (any other outstanding invoice: uniforms, grading, guards, competitions, etc.)
- "Unpaid invoice $x.xx due" — red if the oldest unpaid one is more than 1 month old, amber otherwise.
- The amount is the total still owed across those invoices, after payments and credits.
- Hidden when nothing is owed. Cancelled, replaced, refunded and pre-1 April 2026 invoices are ignored as today.

"More than a month" = invoice date earlier than the same day last month (Singapore/Perth date).

## Technical details
- Extend the database data feeding both tabs (`term_payment` in attendance RPCs, Students tab rows) with: term invoice date, and `other_unpaid_total` + `other_unpaid_oldest_date` from invoices with balance > 0 excluding the term class invoice. Paid/unpaid decision still comes from `_term_payment_status`/`_term_coverage`, unchanged.
- New shared helper `src/utils/paymentBadges.ts` (`termBadge`, `unpaidInvoiceBadge`, `isOverAMonth`) returning label + tone; used by `StudentsTab.tsx` and both badge spots in `AttendanceTab.tsx` so wording and colours match.
- Colours via existing `classColorVar/classColorTint` (red/amber/green) tokens.
- Small bun test for the 1-month boundary and label choice.
