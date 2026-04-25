## Plan — Scorecard PDF refinements

Scope: `src/utils/gradingCertificatePDFGenerator.ts` only. No DB or UI changes.

### 1. Belt label suffix (Certificate page)
When rendering the achieved belt name, append the word **" Belt"** to color belts. Skip the suffix when the belt name contains *Foundation*, *Poom*, or *Dan*.
- `White` → `White Belt`
- `Yellow Tip` → `Yellow Tip Belt`
- … through `Black Tip` → `Black Tip Belt`
- `Foundation 1` → `Foundation 1` (unchanged)
- `Poom 1` → `Poom 1` (unchanged)
- `1st Dan` → `1st Dan` (unchanged)

Logic: `if (!/foundation|poom|dan/i.test(beltName)) beltName += ' Belt';`

Apply this to the belt as it appears on the certificate AND in the new "Belt" row at the top of the scorecard table.

### 2. Result styling (Scorecard – final "Results" row)
- Always render the result value in **UPPERCASE** (`PASS`, `DOUBLE`, `FAIL`).
- When the value is `PASS`, render it in **green** and **bold** in the right-hand cell.
- `DOUBLE` and `FAIL` keep the default black text (bold optional, will keep current weight).

### 3. Unit suffixes on scorecard labels
When rendering scorecard rows, append units to these specific labels in the left-hand cell:
- `Height` → **Height (cm)**
- `Weight` → **Weight (kg)**

Other labels are unchanged. Suffix is added in the PDF only — DB field names and the web editor remain as-is.

### Out of scope
- No changes to the certificate signature, logos, fonts, or layout.
- No changes to the empty-row hiding logic (still skips `-` / `—` / blank).
- No changes to callers (`BranchGradingList.tsx`, `GradingListTab.tsx`).

👉 Approve to switch to default mode and implement.