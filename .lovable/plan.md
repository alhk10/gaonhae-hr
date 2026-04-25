## Plan — Auto-calculated Grading Result (with manual override)

### Goal
The **Result** column (Pass / Double / Fail) should be **auto-derived** from the scorecard scores the examiner enters. The examiner can still manually override it from the edit dialog, and a manual choice must not be silently overwritten by later score edits.

### Scoring rules
Average the available scores using the **deepest** of these three sets that is fully filled in:

1. Poomsae + Balchagi
2. Poomsae + Balchagi + Kyorugi
3. Poomsae + Balchagi + Kyorugi + Hoshinsul

(So if Kyorugi is empty, fall back to set 1; if Hoshinsul is empty but Kyorugi is filled, use set 2; etc. If Poomsae or Balchagi is missing, no auto-result is computed.)

Map the average → result:
- **Fail** → average ≤ 5.9
- **Pass** → 6.0 – 7.9
- **Double** → 8.0 – 10.0

### Findings (read-only)
- Scorecard rows live in the JSONB `scorecard` column on `grading_registrations` as `{label, value}[]`. Labels match `DEFAULT_SCORECARD_LABELS` in `src/constants/scorecardLabels.ts` (already includes Poomsae, Balchagi, Kyorugi, Hoshinsul).
- `extractNumeric()` already exists in that file and handles strings like `"7.5"` or `"8 pts"`.
- Inline score edits go through `InlineScorecardCell.tsx`, which writes the updated `scorecard` array back to `grading_registrations`.
- `result` is a separate column on `grading_registrations` (`'pass' | 'double' | 'fail' | null`) and is currently set only via `GradingBulkEditDialog.tsx`.
- There is **no existing flag** distinguishing "auto" vs "manually set" results — we need one to honour overrides.

### Changes

**1. DB migration — `grading_registrations`**
- Add `result_manual_override boolean not null default false`.
- Backfill existing non-null `result` rows to `true` (so we don't overwrite historical manual entries).

**2. `src/constants/scorecardLabels.ts`** — add helper:
```ts
export type AutoResult = 'pass' | 'double' | 'fail' | null;

export const computeAutoResult = (rows: ScorecardRow[]): AutoResult => {
  const num = (label: string) => extractNumeric(rows.find(r => r.label === label)?.value);
  const p = num('Poomsae'); const b = num('Balchagi');
  const k = num('Kyorugi'); const h = num('Hoshinsul');
  if (p == null || b == null) return null;
  const set = (h != null && k != null) ? [p,b,k,h]
            : (k != null)             ? [p,b,k]
            :                           [p,b];
  const avg = set.reduce((a,c)=>a+c,0) / set.length;
  if (avg <= 5.9) return 'fail';
  if (avg <  8.0) return 'pass';
  return 'double';
};
```

**3. `src/components/dashboard/InlineScorecardCell.tsx`**
- After successfully saving the updated `scorecard`, if `result_manual_override === false`:
  - Compute `computeAutoResult(newRows)` and `update grading_registrations set result = <auto>` for that row.
  - If the auto result is `null` (insufficient data), set `result` back to `null`.
- Trigger a refetch / cache invalidation so the Result cell re-renders.

**4. `src/components/grading/GradingBulkEditDialog.tsx`**
- When the user picks a result manually → save with `result_manual_override: true`.
- Add a small **"Reset to auto"** link/button next to the Result selector that clears the override (`result_manual_override: false`) and immediately recomputes from the current scorecard.
- When the dialog opens, show whether the current value is `(auto)` or `(manual)` for clarity.

**5. `src/components/dashboard/BranchGradingList.tsx` & `src/components/sales/GradingListTab.tsx`**
- Result cell: append a tiny muted `(auto)` suffix when `!result_manual_override`, so examiners can see at a glance which results are derived vs hand-set.
- The cell remains click-to-edit (already implemented in the previous step).
- Update the SELECT in the data fetch to also pull `result_manual_override`.

**6. Out of scope**
- No changes to scoring labels themselves (Poomsae/Balchagi/Kyorugi/Hoshinsul are already in `DEFAULT_SCORECARD_LABELS`).
- No change to certificate generation or the payment-reminder dialog.
- No bulk recompute job for historical rows — backfill simply marks existing results as manual so nothing is overwritten.

👉 Approve to switch to default mode and implement.
