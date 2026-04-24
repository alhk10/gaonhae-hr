## Inline Scorecard with Frozen Columns + Direct PDF Download

Replace the current modal-based scorecard editor with **inline editable cells** in the grading list table. The Student column stays frozen on the left, the action buttons (Cert / Cert II / Actions) stay frozen on the right, and the scorecard columns scroll horizontally in the middle. Pressing the certificate button downloads the PDF directly using the saved scorecard data — no dialog.

### 1. Database (new migration)

**New table `grading_term_scorecard_columns`** — persists which scorecard fields exist per term + branch, so all students in the same grading term share the same column set.

```sql
CREATE TABLE public.grading_term_scorecard_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id text NOT NULL,
  branch_id text NOT NULL,
  label text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (term_id, branch_id, label)
);
ALTER TABLE public.grading_term_scorecard_columns ENABLE ROW LEVEL SECURITY;
-- Policies match existing grading_registrations pattern (authenticated select/insert/update/delete).
```

The existing `grading_registrations.scorecard jsonb` column is reused to store each student's `{label, value}` array.

### 2. New files

- **`src/services/gradingScorecardColumnService.ts`** — CRUD for `grading_term_scorecard_columns`:
  - `listColumns(termId, branchId)`
  - `addColumn(termId, branchId, label)` — also appends `{label, value: ""}` to every student's `scorecard` JSON in that term+branch.
  - `removeColumn(termId, branchId, label)` — strips that label from every student's `scorecard` JSON.
  - First-time access seeds default labels (Height, Weight, Poomsae, Balchagi, Kyorugi, Hoshinsul, Push-ups, Leg Raises, Air Squats).
- **`src/components/grading/InlineScorecardCell.tsx`** — compact `h-7 w-16 text-xs` input. Reads value from row's `scorecard` JSON, debounces save (400 ms) to `grading_registrations.scorecard`. Shows toast on failure. BMI cell variant is read-only and auto-derives when both Height and Weight values are present and numeric.
- **`src/components/grading/ScorecardColumnHeader.tsx`** — header cell with label + delete (×) icon. Plus a trailing `+ Field` header button to add a new column (prompt for label).

### 3. Edited files

- **`src/components/dashboard/BranchGradingList.tsx`**
  - Wrap desktop table in `<div className="overflow-x-auto">`.
  - Apply `sticky left-0 bg-background z-10` to the Student column (`<th>` and `<td>`).
  - Apply `sticky right-0 bg-background z-10` to the Cert / Cert II / Actions column group.
  - Insert dynamic scorecard columns between Result and the right-frozen actions, populated from `grading_term_scorecard_columns` for current term + Morley branch (`BR1768967806476`).
  - Render `InlineScorecardCell` per student row × per column, plus a derived BMI column when both Height + Weight columns exist.
  - **Cert button** now calls `downloadGradingCertificatePDF(...)` directly using the row's saved `scorecard` JSON — no dialog.
  - Mobile (`< md`) card layout untouched (frozen-column UX is desktop-only).
- **`src/components/sales/GradingListTab.tsx`** — same treatment (frozen Student left, frozen actions right, scorecard columns scrollable middle, direct PDF download).
- **`src/utils/gradingCertificatePDFGenerator.ts`** — no layout change; already accepts the scorecard JSON.

### 4. Removed

- **`src/components/grading/GradingScorecardDialog.tsx`** — deleted; flow no longer uses a dialog.

### 5. UX details

- Frozen columns use `sticky` positioning with matching `bg-background` so middle content scrolls cleanly underneath.
- Cert / Cert II buttons remain gated by: result ∈ {pass, double} AND Foundation→Black Tip belt range AND Morley branch (other branches show disabled tooltip "Template pending for this branch").
- Add/remove column updates **all students in the same term + branch at once** — matches the "add scorecard to existing row" intent.
- React Query cache (`['grading-list-students', ...]` and column query) invalidated on any column or value change.
- Toast feedback on every save / column mutation.

### Out of scope (Phase 2)
- Singapore template + non-Morley branches.
- Drag-to-reorder columns (use add/remove only).
- Auto-flipping `certificate_issued` on download.

---

Click **Approve** on this plan card to switch into default mode and execute everything in one pass.