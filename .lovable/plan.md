Display the Amount column as **amount including 9% GST** across all three submission tabs on `/grading-list`.

## Changes

Multiply the stored `r.amount` (which is ex-GST) by **1.09** in the row renderers:

1. **Grading tab** — `src/pages/public/PublicGradingList.tsx` line ~1373
   `$${(Number(r.amount) * 1.09).toFixed(2)}`
2. **Competitions tab** — `src/pages/public/PublicGradingList.tsx` line ~2047
   `formatCurrency(Number(r.amount) * 1.09)`
3. **Seminars tab** — `src/components/grading-list/SeminarsTab.tsx` line ~216
   `$${(Number(r.amount) * 1.09).toFixed(2)}`

Header label stays "Amount" (values are now GST-inclusive, matching what the customer paid). PDF subtotal/GST/total breakdown is unchanged.

## Out of scope
- No DB changes; `amount` continues to store the ex-GST subtotal.
- No changes to the PDF amount-by-branch table (already shows Subtotal + GST + Total).