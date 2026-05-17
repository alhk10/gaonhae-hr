## Add PDF download for filtered grading list

Add a "Download PDF" button on `/grading-list` that exports the currently filtered date's groups as a 2-column PDF document.

### UI

- In `src/pages/public/PublicGradingList.tsx`, add a `Download` icon button next to the date filter (top of page).
- Button is disabled when `groups.length === 0` or while loading.
- Filename: `grading-list-{date or 'all'}.pdf` (date in DD/MM/YYYY → `28-06-2026`).

### PDF generation

- Use `jsPDF` + `jspdf-autotable` (already used elsewhere in the project for PDFs — will verify; otherwise add).
- A4 portrait, margins ~12mm.
- **Title**: "Grading List" centered, with selected date (or "All dates") as subtitle.
- **2-column layout**: page split into two equal columns. Each slot group is rendered as a small block (title + mini table of #, Branch, Student, Belt, Status). Blocks flow top-to-bottom in the left column, then continue into the right column, then onto the next page.
- Groups are kept intact (no splitting a group across columns). If a group is taller than a column, it spans naturally to the next column.
- Same sort order as the screen view (branch asc, then student asc within each slot).

### Out of scope

- No edit-mode columns (Amount / Proof / actions) in the PDF — public-facing summary only.
- No backend or data changes.
