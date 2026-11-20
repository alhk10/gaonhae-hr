# Compact one-page layout for external customer invoices

## What changes (external invoices only; student invoices unchanged)
- Top margin above the logo is reduced by 20%.
- The gaps between sections are tightened by about 25%: header → INVOICE title → invoice details → Bill To → items table → totals → notes → payment details/QR.
- Item rows, totals rows and notes lines use slightly tighter line spacing. Notes and terms text drops by 1pt.
- **One-page rule:** when the invoice has at most 6 items or at most 12 printed item lines (counting wrapped names), everything fits on page 1, including the notes, terms, bank/PayNow details and QR.
  - If it still overflows, the notes, terms and payment block shrink a little more, and the QR becomes smaller, until they fit.
- Invoices with more items flow onto page 2 as they do today.

## Technical details
- `src/utils/invoicePDFGenerator.ts`: add a `compact` spacing scale used when `customer_type === 'external'`. Starting `yPos` is 16 instead of 20, and the fixed `yPos +=` gaps are multiplied by 0.75 (min 3mm). External rows advance 5mm plus 3.6mm per extra wrapped line.
- Count printed item lines first. If within the limit, skip the page-break checks for notes and the payment block. If the remaining height is too small, step down the notes font (8 → 7pt) and QR size (down to 60%) so the payment block ends above the footer.
- Verify by regenerating INV-202611-0073 (4 items, 8 lines) and confirming it is 1 page, with rendered page images checked for overlap and clipping.
