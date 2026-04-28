## Goal

The PDF "GRADING SCORECARD" page currently lists rows in whatever order they appear in the registration's `scorecard` JSON, with BMI appended at the very end. The user wants the rows in the same left-to-right order as the grading list, starting with **Height, Weight, BMI**, followed by the remaining columns in column order (Poomsae, Balchagi, Kyorugi, Hoshinsul, Push-ups, Leg Raises, Air Squats, plus any custom-added columns at their saved positions).

The grading list column order lives in `grading_term_scorecard_columns.position` (per term + branch), fetched via `listColumns()` in `src/services/gradingScorecardColumnService.ts`.

## Changes

### 1. `src/utils/gradingCertificatePDFGenerator.ts`
- Extend `GradingCertificateInput` with an optional `columnOrder?: string[]` (ordered list of labels from the grading list header).
- In `drawScorecardPage`:
  - After filtering blanks and computing BMI via `withDerivedBmi`, sort `dataRows` using a comparator:
    1. Height → first
    2. Weight → second
    3. BMI → third
    4. Remaining rows → ordered by index in `columnOrder` (case-insensitive label match); rows whose label isn't in `columnOrder` go to the end, preserving their original relative order.
- Keep the existing 3 structural header rows (Grading Date, Student Name, Belt) at the top and the Results row at the bottom — only the data rows in between get reordered.

### 2. `src/components/dashboard/BranchGradingList.tsx`
- The component already loads scorecard columns for the current term + branch (used to render the inline scorecard headers). Pass that ordered label list as `columnOrder` to:
  - `runCertificate` → `downloadGradingCertificatePDF({ ..., columnOrder })`
  - `buildBulkInputs` → both Cert I and Cert II inputs.
- If for any reason the columns aren't loaded yet (e.g. cross-branch row in bulk), fall back to the default order from `DEFAULT_SCORECARD_LABELS`.

### 3. `src/components/sales/GradingListTab.tsx`
- Mirror the exact same change: thread the active term + branch's `columnOrder` into `runCertificate` and `buildBulkInputs`.
- For the sales view (which can span multiple branches in bulk), use each row's own `branch_id` + `term_id` to look up its column order; fall back to defaults if missing.

### Notes
- No DB / schema changes.
- No change to the inline scorecard editor or the certificate page 1.
- Custom columns added by examiners (e.g. "Chagi") will appear in their saved position automatically because `columnOrder` already reflects what the grading list shows.

## Affected files
- `src/utils/gradingCertificatePDFGenerator.ts`
- `src/components/dashboard/BranchGradingList.tsx`
- `src/components/sales/GradingListTab.tsx`
