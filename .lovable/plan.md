Revert GST-inclusive amount display in **Competitions** and **Seminars** tabs. Keep the GST-inclusive amount in the **Grading** tab only.

## Changes

1. `src/pages/public/PublicGradingList.tsx` line ~2047 (Competitions tab) — revert to:
   `formatCurrency(Number(r.amount))`
2. `src/components/grading-list/SeminarsTab.tsx` line ~216 (Seminars tab) — revert to:
   `${Number(r.amount).toFixed(2)}`
3. Grading tab line ~1373 — leave as `(Number(r.amount) * 1.09)` (no change).