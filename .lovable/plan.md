# Grading Certificate PDF — AU (Morley) Template with Flexible Scorecard

Generate a 2-page PDF (Page 1 = Certificate, Page 2 = Scorecard) for Foundation → Black Tip results, modelled on the uploaded `Grading_Certificate_Template_Morley.pdf`.

## Scope rules

- **Branch scope (Phase 1):** Only enabled for **Morley** (`branch_id = BR1768967806476`, country = `Australia`). Other AU branches added later inherit the same template; the country gate is `country === 'Australia'`.
- **Singapore branches:** Use a **different template** (Phase 2, not built in this iteration). The certificate button on SG-branch rows is hidden until that template ships.
- **Belt scope:** Only when `target_belt` is one of *Foundation, Foundation 1/2/3, White, Yellow Tip, Yellow, Green Tip, Green, Blue Tip, Blue, Red Tip, Red, Black Tip*. Poom/Dan grades are excluded (Kukkiwon cert handles those).
- **Eligibility:** Button enabled only when `result === 'pass'` or `result === 'double'`. For `double`, **two** certificate buttons are shown — Cert I (first belt) and Cert II (second belt).
- **Date format on certificate:** Long form, e.g. `24 April 2026` (not DD/MM/YYYY) — explicit user choice for ceremonial documents. The Branch Dashboard list itself continues to show DD/MM/YYYY per the project-wide date rule.
- **Action:** Generate → download PDF only. Do NOT auto-flip `certificate_issued` / `certificate_ii_issued`; staff toggle those manually (existing behaviour preserved).
- **Belt label printed on Page 1:** the belt the student has just **passed into** (i.e. `target_belt`), e.g. *"Yellow Belt"*. For `double`, Cert I prints the intermediate belt and Cert II prints the final `target_belt`.

## Page 1 — Certificate (fixed layout)

Single-page A4 landscape (matches the uploaded sample). Static elements drawn from bundled assets (no DB-driven layout):
- Top-right: World Taekwondo + Kukkiwon + branch logos (PNG assets stored under `src/assets/certificates/au/`)
- Title block: `CERTIFICATE OF GRADING`
- Body: `This is to certify that` / **Student Name (uppercase)** / `has successfully passed the grading examination for` / **{Belt achieved} Belt**
- Footer: `Date: 24 April 2026` (left), Examiner signature image + `Master <Name>` (right)
- Branch line at bottom: `Morley Branch — Western Australia`

All text and asset positions are hard-coded constants in `gradingCertificatePDFGenerator.ts`. No DB lookup of layout.

## Page 2 — Scorecard (FLEXIBLE columns, examiner-defined)

The scorecard is **not** a fixed schema. The examiner adds/removes rows per grading session. The PDF renders whatever the examiner captured for that registration — nothing more, nothing less.

### Data model — flexible JSON, not fixed columns

Add a single JSONB column on `grading_registrations` to hold an ordered list of scorecard entries:

```sql
ALTER TABLE public.grading_registrations
  ADD COLUMN IF NOT EXISTS scorecard jsonb;

-- Example payload:
-- [
--   { "label": "Height", "value": "142 cm" },
--   { "label": "Weight", "value": "36 kg" },
--   { "label": "BMI",    "value": "17.9" },
--   { "label": "Poomsae",   "value": "Pass" },
--   { "label": "Balchagi",  "value": "Pass" },
--   { "label": "Push-ups (1 min)", "value": "32" },
--   { "label": "Leg raises", "value": "28" },
--   { "label": "Air squats", "value": "40" }
-- ]
```

Why JSON instead of fixed columns:
- Examiners change criteria across belts (e.g. push-ups added at Green; Hoshinsul only from Blue Tip).
- Future-proof: new tests can be added without migrations.
- Per-row ordering is preserved (array order = print order).

A small set of label **suggestions** (not enforced) lives in a frontend constant `SCORECARD_LABEL_SUGGESTIONS` so examiners get an autocomplete dropdown, but they can type any custom label.

### Scorecard editor UI — `GradingScorecardDialog.tsx`

Compact dialog opened from the per-row Pencil icon (Morley AU rows only) **or** automatically before the Generate Certificate action when `scorecard` is null/empty.

**Persistence (REQUIRED):** Every Save action writes the full `scorecard` array to `grading_registrations.scorecard` via Supabase update. The dialog is the single source of truth — re-opening it always reloads the latest persisted JSON from the DB (via the existing React Query `grading_registrations` cache, invalidated on save). Nothing is held only in component state. Both buttons persist:
- **Save** → writes to DB, closes dialog, toast "Scorecard saved".
- **Save & Generate PDF** → writes to DB first, then generates PDF from the just-saved data.
- **Cancel** → discards local edits, no DB write.

Layout:
- Header: `Scorecard — {Student Name} — {Target Belt}`
- Read-only context strip: Height / Weight inputs (auto-calculate BMI shown beside) — these are convenience fields that get pushed into the JSON array as the first three entries.
- Dynamic table:
  - Columns: `Label` (autocomplete `Combobox` from suggestions) · `Value` (free text) · row delete `✕`
  - `+ Add row` button at the bottom
  - Drag handle `⋮⋮` to reorder (optional Phase 1.5; otherwise rely on add-order)
- Footer: `Cancel` · `Save` · `Save & Generate PDF`

`SCORECARD_LABEL_SUGGESTIONS` (initial set, editable in the constants file):
```
Height, Weight, BMI, Poomsae, Balchagi, Kyorugi, Hoshinsul,
Push-ups (1 min), Leg raises (1 min), Air squats (1 min),
Sit-ups, Plank, Sprint, Flexibility, Attendance, Discipline, Attitude
```

### Page 2 PDF rendering

`gradingCertificatePDFGenerator.ts` reads the `scorecard` array and renders a 2-column table:
- Column 1: Label (left-aligned, bold)
- Column 2: Value (right-aligned)
- Row height auto-fits content. If the array is long the table flows vertically; if it overflows the page, continue on a Page 3 (rare — typically ≤ 12 rows).
- If `scorecard` is null/empty, Page 2 prints an empty bordered scorecard placeholder so the examiner can fill it in by hand (fallback for legacy records). The Generate flow always asks the user to either fill it in or proceed with the blank version.

### Header strip on Page 2 (always printed, drawn from registration + student)

- Student Name · Date of Birth · Belt Achieved · Grading Date (`24 April 2026`) · Branch (`Morley`) · Examiner

These are not part of the flexible array — they're fixed metadata at the top of the scorecard.

## Eligibility & button rendering

In `BranchGradingList.tsx` and `GradingListTab.tsx`:

```ts
const branch = useBranchCountry(student.branch_id); // existing hook
const isAU = branch === 'Australia';
const isMorley = student.branch_id === 'BR1768967806476';
const beltOK = isFoundationToBlackTip(student.target_belt);   // new helper
const canCertI  = isAU && isMorley && beltOK && (student.result === 'pass' || student.result === 'double');
const canCertII = isAU && isMorley && beltOK &&  student.result === 'double';
```

Button cluster in the Cert / Cert II columns shows enabled icons only when those flags are true. Hover tooltip explains why a button is disabled (wrong country, wrong belt, no result yet, etc.).

For SG branches: render the existing greyed-out "Cert (SG template pending)" placeholder so staff know it's coming.

## Implementation steps

1. **Migration** — add `scorecard jsonb` column on `grading_registrations` (nullable, default null). No backfill needed.
2. **Constants** — add `src/constants/beltLevels.ts → isFoundationToBlackTip(belt)` helper and `src/constants/scorecardLabels.ts → SCORECARD_LABEL_SUGGESTIONS`.
3. **PDF generator** — `src/utils/gradingCertificatePDFGenerator.ts` (jsPDF, A4 landscape). Two functions:
   - `generateAUCertificate({ registration, student, branch, certVariant: 'I' | 'II' })`
   - Internal `drawPage1AU(...)` and `drawPage2Scorecard(...)`.
   - Bundled assets under `src/assets/certificates/au/` (logos + signature PNG).
4. **Scorecard dialog** — `src/components/grading/GradingScorecardDialog.tsx` (flexible row editor, autocomplete labels, BMI auto-calc).
5. **Wire-up** — in both grading list components:
   - Add `Award` icon button per row, gated by the eligibility logic above.
   - On click: if `scorecard` is null/empty → open `GradingScorecardDialog` first; else → call generator directly.
   - Pencil icon on the row also opens the scorecard dialog (separate from the grading-slot/result bulk dialog).
6. **Memory** — add `mem://features/grading/certificate-au-morley` describing the AU/Morley scope, JSON scorecard shape, and that SG template is deferred. Update `mem://index.md` Memories list.

## Files to create / edit

**Create**
- `supabase/migrations/<ts>_add_grading_scorecard_jsonb.sql`
- `src/utils/gradingCertificatePDFGenerator.ts`
- `src/components/grading/GradingScorecardDialog.tsx`
- `src/constants/scorecardLabels.ts`
- `src/assets/certificates/au/` (logos + Master signature PNG — placeholders if assets aren't supplied yet)
- `mem://features/grading/certificate-au-morley`

**Edit**
- `src/constants/beltLevels.ts` (add `isFoundationToBlackTip`)
- `src/components/dashboard/BranchGradingList.tsx`
- `src/components/sales/GradingListTab.tsx`
- `mem://index.md`

## Out of scope (Phase 2 — explicitly deferred)

- **SG certificate template** — separate generator (`generateSGCertificate(...)`), separate assets, will reuse the same flexible `scorecard` JSON column and the same `GradingScorecardDialog`. Wire-up gated on `country === 'Singapore'`.
- Roll-out to **other AU branches** beyond Morley — flip the gate to `isAU` only (drop the `isMorley` check) once additional AU branches go live.
- Drag-to-reorder scorecard rows (currently rely on add order + delete/re-add).
- Automatic flipping of `certificate_issued` / `certificate_ii_issued` flags (kept manual per current UX).

## Verification checklist

- Morley row, result = pass, belt = Yellow Tip → Cert I button enabled, Cert II hidden. Click → scorecard dialog → fill 5 rows → Save & Generate → 2-page PDF downloads. Page 1 shows "Yellow Tip Belt" and "24 April 2026". Page 2 lists exactly the 5 rows entered.
- Morley row, result = double, belt = Yellow → Cert I + Cert II both enabled. Cert I prints intermediate (Yellow Tip), Cert II prints Yellow.
- Morley row, result = pass, belt = 1st Poom → both Cert buttons hidden (out of belt range).
- Jurong West row → Cert button disabled with tooltip "Singapore template pending".
- Re-opening the scorecard dialog for a registration that was already saved restores the same rows in the same order.
- Examiner removes the `Push-ups` row → re-generates → PDF no longer shows that line.
