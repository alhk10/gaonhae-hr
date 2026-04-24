## Grading Certificate PDF — Phase 1 (Morley/AU only)

Generate downloadable PDF certificates for grading registrations with a flexible, database-persisted scorecard. Restricted to the Morley branch (Australia) for Phase 1; Singapore branches will use a different template in Phase 2.

### Scope & rules
- **Belts**: Foundation → Black Tip only.
- **Eligibility**: Only `result = 'pass'` or `'double'`. `'double'` generates **two** certificates (current belt + next belt).
- **Branch gate**: Only `branch_id = BR1768967806476` (Morley). Other AU branches and SG branches show a disabled button with tooltip *"Template pending for this branch"*.
- **Action**: Download only. No auto-flip of `certificate_issued`.
- **Date**: Long format, e.g. `24 April 2026`.

### Flexible scorecard (persisted to DB)
- New column `scorecard jsonb NOT NULL DEFAULT '[]'::jsonb` on `grading_registrations`.
- Stores ordered array of `{ label: string, value: string }` — examiner can add/remove/reorder rows per registration.
- Auto-derived **BMI** appended on the PDF when both `Height` and `Weight` rows are present (display-only, not stored).
- Default seed labels (only when no record exists yet): Height, Weight, Poomsae, Balchagi, Kyorugi, Hoshinsul, Push-ups, Leg Raises, Air Squats.

### Files

**Migration (new)**
- `supabase/migrations/<ts>_add_grading_scorecard.sql` — `ALTER TABLE grading_registrations ADD COLUMN scorecard jsonb NOT NULL DEFAULT '[]'::jsonb;`

**New files**
- `src/constants/scorecardLabels.ts` — default seed labels.
- `src/utils/gradingCertificatePDFGenerator.ts` — jsPDF generator. Page 1 = formal certificate (student name uppercase, belt achieved, branch, long-format date, examiner). Page 2 = scorecard table rendered from saved JSON + auto BMI line.
- `src/components/grading/GradingScorecardDialog.tsx` — compact dialog: loads `scorecard` via React Query, dynamic add/remove rows, two actions: **Save** and **Save & Generate PDF**. Uses `@/utils/dateFormat` (DD/MM/YYYY everywhere except the certificate body which uses long format per spec).

**Edited files**
- `src/constants/beltLevels.ts` — add `isFoundationToBlackTip(belt)` helper.
- `src/components/dashboard/BranchGradingList.tsx` — Award icon button on each eligible row; disabled+tooltip when not Morley; two buttons (Cert I / Cert II) for `double`.
- `src/components/sales/GradingListTab.tsx` — same Award button + dialog wiring.

### UX details
- Award button visible only when: result ∈ {pass, double} **AND** belt is Foundation→Black Tip **AND** branch = Morley.
- Clicking Award opens `GradingScorecardDialog`; saving persists to `grading_registrations.scorecard` and invalidates the grading list query.
- For `double`: two Award buttons rendered (Cert I = current belt passed, Cert II = next belt). Each generates its own PDF using the same scorecard.
- PDF filename: `Certificate_<StudentName>_<Belt>_<yyyy-MM-dd>.pdf`.

### Out of scope (Phase 2)
- Singapore certificate template + branch enablement.
- Drag-to-reorder scorecard rows (current dialog uses up/down arrows or simple add/remove).
- Auto-marking `certificate_issued` on download.

Approve to switch into default mode and execute everything in one pass.