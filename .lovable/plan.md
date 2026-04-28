## Goal

Make the AU grading certificate print the belt the student **just passed** (their `current_belt`) instead of the next/target belt. This fixes Teo Olivere ("White" → "Foundation") and Earl John ("Foundation 1" → "Foundation"), and aligns all future certificates with the same convention.

## Changes

### 1. `src/components/dashboard/BranchGradingList.tsx` (single-cert + bulk)
- In `runCertificate`: replace the `target_belt`/`getNextBeltLevel(current_belt)` derivation with `student.current_belt` as the base belt. Cert II (double promotion) becomes `getNextBeltLevel(current_belt, 'AU')`.
- In `buildBulkInputs`: same swap — `baseBelt = student.current_belt`. Keep the `isFoundationToBlackTip` gating, but check it against `current_belt` instead of `target_belt || current_belt`. Cert II for doubles becomes `getNextBeltLevel(current_belt, 'AU')`.

### 2. `src/components/sales/GradingListTab.tsx`
- Apply the identical changes to the mirrored `runCertificate` and `buildBulkInputs` functions.

### 3. No DB changes
The two affected registrations don't need editing — re-downloading the cert after this fix will produce the correct output (both students already have `current_belt = 'Foundation'`).

### Notes / safeguards
- If `student.current_belt` is empty/null, show the existing "Could not determine target belt" toast (updated message: "Student has no current belt recorded").
- For the bulk filename and per-row filename, the slugified belt now reflects the achieved (current) belt, e.g. `Certificate_TEO_OLIVERE_TABIGUE_Foundation_2026-04-11.pdf`.
- All other certificate logic (scorecard page, signatures, paid-status confirmation popup, Morley-only gating) remains unchanged.

## Affected files
- `src/components/dashboard/BranchGradingList.tsx`
- `src/components/sales/GradingListTab.tsx`