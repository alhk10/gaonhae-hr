# Show Foundation belts in /grading Current Belt

## Problem
On the public `/grading` page, the Current Belt dropdown starts at "White" — Foundation 1, 2 and 3 are hidden whenever the student is older than 6 years 3 months, because the belt list is age-filtered.

## Change
Always include Foundation 1, Foundation 2 and Foundation 3 in the Current Belt options, regardless of age. Poom/Dan age rules stay as they are.

## Technical detail
- `src/pages/public/PublicGradingPayment.tsx`: in `filterBeltsByAge`, return `true` for Foundation belts instead of gating on the 75-month buffer (drop the now-unused `foundationOk` logic).
- No changes to grading product lookup, slot eligibility, or pricing — selecting a Foundation belt continues to use the existing Foundation transition flow.
