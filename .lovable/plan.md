## Goal
The Total card currently shows only `$220.00` with no visible tax breakdown. Show the user exactly how much GST is included in that total.

## Changes — `src/pages/public/PublicCompetitionPayment.tsx`

Update the Total card (around lines 552–565) so when `gstRate > 0` it shows three explicit rows instead of one collapsed line:

```
Subtotal (excl. GST)        $201.83
GST (9%)                     $18.17
Total (incl. GST)           $220.00
```

Details:
- Compute `subtotal = totalAmount - gstAmount` (totals stay GST-inclusive — no change to amounts charged).
- Render Subtotal and GST rows in normal text size (`text-sm`), Total row in bold/`font-semibold` with a top border separator.
- When `gstRate === 0` (non-SG/AU branches), keep the current single Total row.
- Use the branch country to label the GST rate, e.g. `GST (9%)` for Singapore, `GST (10%)` for Australia.

## Out of scope
- No changes to pricing, submission payload, DB, or other public payment pages.
- Per-line-item tax columns are not added; breakdown stays at the total level.
