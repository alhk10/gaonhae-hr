## Fix Grading Preparation PDF layout

The current PDF overflows the A4 page width ("School Fees" clipped at the right edge). Adjust `src/utils/gradingPrepPDFGenerator.ts` only — no other files change.

### Changes to `generateGradingPrepPDF`

1. **Resize columns to fit A4 usable width (186mm)** — sum of column widths must equal `usableW`, not exceed it. New widths (mm):
   - `#` 8, `Student Name` 56, `Belt` 22, `Ready for Grading` 28, `Paid` 14, `Slot` 40, `School Fees` 18 → total 186mm.
   - Remove the "distribute leftover to name col" block; widths now sum exactly.

2. **Wrap header text** — use `doc.splitTextToSize(label, colW - 3)` for each header cell and render line-by-line. Grow header row height to fit the tallest wrapped label (e.g. "Ready for Grading", "School Fees" wrap to 2 lines). Center-align wrapped lines vertically.

3. **Reduce text size**
   - Header row: 8pt (was 9pt), bold (already bold — keep).
   - Body rows: 8pt (was 9pt). Reduce row height from 8mm → 7mm.
   - Title/meta block unchanged.

4. **Bold first data row** — set `helvetica/bold` when `idx === 1`, normal afterwards. (Per request: "bold first row" — interpreted as the first student row, since the header is already bold.)

5. Update name-truncation width check to use the new name column width.

### Out of scope

- No change to `BranchGradingList.tsx` or the print button.
- No change to columns shown or data sourced.
