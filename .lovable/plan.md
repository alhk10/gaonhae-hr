## Add Print button for Grading Preparation PDF

Add a **Print** button to the right of the "Yet to Receive" tab in the `Students for Grading` toolbar (`src/components/dashboard/BranchGradingList.tsx`). Clicking it generates a PDF of the **currently displayed students** (respects the active term + tab filter) using `jsPDF` (already used elsewhere, e.g. `taxExport.ts`).

### PDF contents

Title: `Grading Preparation — {Branch Name} — {Term Name}` with generation date.

Table columns:
| # | Student Name | Belt | Ready for Grading | Paid | Slot | School Fees |
|---|--------------|------|-------------------|------|------|-------------|

- **Student Name** — filled (uppercase, matches on-screen formatting)
- **Belt** — filled (current belt)
- **Ready for Grading** — blank box (for manual tick)
- **Paid** — blank box (for manual tick)
- **Slot** — blank line (for manual write-in)
- **School Fees** — blank box (for manual tick)

Sorting matches the on-screen order (belt rank → DOB → name).

### UI

In the toolbar row (lines ~798-805), add to the right of the `<Tabs>`:

```
<Button size="sm" variant="outline" onClick={handlePrintPrep} className="h-8 text-xs">
  <Printer className="w-3.5 h-3.5 mr-1" /> Print
</Button>
```

Place inside the same flex container so it sits far-right; if the toolbar isn't already flex with `justify-between`, wrap accordingly.

### Implementation

New helper `utils/gradingPrepPDFGenerator.ts`:
- Function `generateGradingPrepPDF({ students, branchName, termName })`.
- A4 portrait, jsPDF, simple ruled table with empty cells for tick/write columns, page breaks when `y > 280`.
- Saves as `Grading_Prep_{Branch}_{Term}.pdf`.

In `BranchGradingList.tsx`:
- Import `Printer` from `lucide-react` and the new helper.
- `handlePrintPrep` calls helper with `displayedStudents`, current term name (lookup from `branchTerms`), and branch name (already available via prop or query).

### Out of scope

- No DB or service changes.
- No changes to the other tabs (Weekly Timetable, Students, Invoice & Payment, Inventory, Notices).
- No changes to existing Actions column or other PDF exports.

### Files

- **Edit** `src/components/dashboard/BranchGradingList.tsx` — add button + handler.
- **Create** `src/utils/gradingPrepPDFGenerator.ts` — PDF builder.
