# Grading List PDF: continuous column flow

## Change
Gradings in the PDF flow in time order: down the left column, then down the right column, then onto the next page. Groups are no longer balanced between the columns.

- Each grading starts right after the previous one in the same column, e.g. "Balmoral - 27/09/2026 - 10:00 - Stage 4 - 26" directly under "9:20 - Stage 1 - 3".
- If fewer than 4 rows of space are left in a column, the next grading starts at the top of the next column instead.
- If a grading doesn't fit, it is split. The rest continues at the top of the next column (or page) under the same heading with "(cont)" added, e.g. "Balmoral - 27/09/2026 - 10:00 - Stage 4 - 26 (cont)", with the table header repeated.
- Row numbers carry on across the split (e.g. 10, 11, 12…), not restarting at 1.
- Title, logo, column widths, colours and footers stay the same.

## Technical details
- `PublicGradingList.tsx` `handleDownloadPdf`: replace the page/balance partition with a cursor `{ page, col, y }`.
- For each group: if the space left is under title + header + 4 rows, move to the next column or page. Then take as many rows as fit (using the existing `rowH` measurement), render them with `renderGroupAt` (passing a row slice, a starting index and a title suffix), and repeat for the remainder with the " (cont)" suffix.
- Next column → col 1 at `contentTop`; past col 1 → `addPage()` + title/logo redraw, col 0.
