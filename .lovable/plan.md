# Fix the items header background on external invoices

## Problem
On external invoice PDFs, the grey band behind "Products/Services / Qty / Unit Price / Discount / Tax / Total" reaches down into the first item row. The tighter spacing moved that row up, but the band kept its full height.

## Change (external invoices only)
- Shrink the grey band so it wraps only the header words, with even space above and below them.
- Start the first item row just below the band, with a small gap, so the band never touches it.
- Student invoices stay as they are.

## Technical details
- `src/utils/invoicePDFGenerator.ts`: when `isExt`, draw the header rect at `yPos - 4.5` with height `7` (ends at `yPos + 2.5`). Advance `yPos += 7` before the rows, so the first baseline is about 4.5mm below the band, clear of the cap height.
- Verify by regenerating INV-202611-0073 and viewing the rendered page. Check there is no overlap and it is still 1 page.
