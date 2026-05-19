## Goal

In the Grading List PDF (`handleDownloadPdf` in `src/pages/public/PublicGradingList.tsx`):

1. Arrange grading slot blocks **down the left column first, then continue down the right column** — never split a single slot block across columns or pages.
2. Distribute groups so both columns finish at roughly the same vertical position (even fill).
3. Reduce file size.

Today, the renderer greedily places each next group in the currently-shorter column. That produces the zig-zag layout in your screenshot (slots alternating left/right) instead of a clean left-then-right flow.

## Plan

### 1. Pre-measure each group's height

Before drawing, compute the rendered height of every group using the same estimate already in code (`4.5 + headH + body.length * estRowH + 4`) plus the title line count. Store as an array `heights[]` aligned with `groups[]`.

### 2. Partition groups into pages, then into left/right columns

For each page:
- Walk groups in order accumulating heights until adding the next group would exceed `2 × columnCapacity` (where `columnCapacity = contentBottom − contentTop`). That set of groups belongs to the current page. No group is ever split.
- Within the page's groups, find the **split index k** that minimizes `|sumLeft − sumRight|` subject to `sumLeft ≤ columnCapacity` and `sumRight ≤ columnCapacity`, where `sumLeft = Σ heights[0..k-1]` and `sumRight = Σ heights[k..end]`. This gives the most even balance while keeping reading order (left column first, then right column).
- If no valid k exists for the chosen page set (a single group is taller than one column, etc.), fall back: pack groups into the left column until it overflows, push remainder to the right column; spill any leftover to the next page.

### 3. Render

Render the left-column groups top-to-bottom at `colX[0]`, then the right-column groups at `colX[1]`. Reset `colY` per page. The existing per-group rendering (title + autoTable + branch/status cell coloring) is unchanged — only the placement loop is rewritten.

### 4. Compress the PDF

Construct the jsPDF instance with `compress: true`:

```ts
const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
```

Apply the same to the summary PDF at line 424 for consistency. The logo is already a small PNG; no image re-encoding needed. This typically cuts file size 40–60% for text/table-heavy PDFs.

## Files to change

- `src/pages/public/PublicGradingList.tsx`
  - Replace the placement loop inside `handleDownloadPdf` (around lines 302–385) with the pre-measure + partition + render approach above.
  - Add `compress: true` to both `new jsPDF(...)` calls (lines 277 and 424).

## Out of scope

- Certificate / bulk-certificate PDFs (separate generator).
- Visual styling of slot tables (colors, fonts, columns) — kept as-is.
