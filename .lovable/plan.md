Update `/grading-list` competition tab so every category badge occupies its own full row in the Categories cell.

Implementation plan:
- In `src/pages/public/PublicGradingList.tsx`, change the competition Categories cell layout from a flex column to a block/grid layout that cannot shrink category badges side-by-side.
- Make each badge render as its own block (`w-fit`/block wrapper) with no wrapping inside the badge text, so `Individual`, `Pair`, and `Team` appear on separate lines consistently.
- Keep all existing sorting, columns, actions, and data unchanged.

Technical details:
- Target the competition table body around the `r.category_names.map(...)` render.
- Replace the current `flex flex-col items-start gap-1` structure with a vertical `grid`/`space-y-1` structure and ensure each mapped item is wrapped in a full-width row.