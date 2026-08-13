# Show Foundation belts in /grading Current Belt

## Problem
On the public `/grading` page, the Current Belt dropdown starts at "White" — Foundation 1, 2 and 3 are hidden whenever the student is older than 6 years 3 months, because the belt list is age-filtered.

## Change
Show Foundation 1, Foundation 2 and Foundation 3 in the Current Belt dropdown until the student turns 7. Poom/Dan age rules stay as they are.

## Technical detail
- `src/pages/public/PublicGradingPayment.tsx`: in `filterBeltsByAge`, change the Foundation buffer from 6 years + 3 months (75 months) to 7 years (84 months).
- Keep the existing Foundation transition flow for product lookup, slot eligibility and pricing unchanged.
- If the selected branch country changes and the current belt is no longer in the new belt list, reset the field as currently done.
