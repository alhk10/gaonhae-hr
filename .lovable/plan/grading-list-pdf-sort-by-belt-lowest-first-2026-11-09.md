# Grading List PDF: sort by belt, lowest first

## Change
Within each grading table in the PDF, students are listed from the lowest belt to the highest. For example, all Foundation 1 come first, then Foundation 2, then Foundation 3, then White, Yellow Tip, and so on up to Poom/Dan.

- Students on the same belt stay grouped by branch, then sorted by name.
- Row numbers follow the new order, and the "(cont)" split still works.
- The on-screen Grading tab is unchanged.

## Technical details
- `PublicGradingList.tsx` `handleDownloadPdf`: before the column flow, sort each group's items by a belt rank from the belt order in `@/constants/beltLevels` (country-aware list; Poom before Dan). Unknown belts go last, then branch name, then student name.
