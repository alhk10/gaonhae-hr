## Plan — Grading Certificate PDF template updates

### Goal
Update the 2-page grading certificate PDF (`src/utils/gradingCertificatePDFGenerator.ts`) to match the new examiner-approved template.

### Page 1 — Certificate
- **Remove** the "Master Alvin Lee" name and the "Examiner" label printed under the signature image. The signature image itself stays.

### Page 2 — Scorecard
- Title: change `"Grading Scorecard"` → **`"GRADING SCORECARD"`** (all uppercase).
- **Remove** the subtitle line that currently prints `Student name · Belt · Grading Date` under the title.
- **Remove** the grey **"Field / Result"** header row at the top of the table.
- **Insert 3 new rows at the top** of the table (same 2-column layout as the scorecard rows):
  1. `Grading Date`  | formatted long date (e.g. `25 April 2026`)
  2. `Student Name`  | student's full name
  3. `Belt`          | belt achieved
- **Append a final row** at the bottom of the table:
  - `Results` | the Result value, capitalised (`Pass`, `Double`, `Fail`, or blank if not set)
- **Hide rows with `—` / empty values**: any scorecard data row whose value is missing, blank, or just a dash (`-` / `—`) is skipped entirely (not rendered as `Label | —`). The 3 structural header rows (Date / Name / Belt) and the final `Results` row are always shown.

### Data plumbing
- Extend `GradingCertificateInput` with an optional `result?: 'pass' | 'double' | 'fail' | null` field.
- Update the two callers that generate certificates so they pass `result` through:
  - `src/components/dashboard/BranchGradingList.tsx`
  - `src/components/sales/GradingListTab.tsx`
  Both already have `student.result` available from the existing query.

### Out of scope
- No DB changes — `result` already exists on `grading_registrations`.
- No change to logos, fonts, page size, or signature image.
- No change to the auto-result calculation logic shipped previously.

👉 Approve to switch to default mode and implement.