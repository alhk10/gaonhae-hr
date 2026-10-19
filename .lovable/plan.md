# Smaller PayNow QR on invoices

The QR code overlaps the footer at the bottom of the invoice.

- Reduce the QR from 42mm to 30mm so it fits above the footer line.
- If there is still not enough room on the page, move the QR (and footer) to keep them from overlapping.

## Technical details
- `src/utils/invoicePDFGenerator.ts`: `qrSize` 42 → 30; before drawing, if `qrStartY + qrSize` exceeds footer top (pageHeight - ~25mm), shrink to fit (min 24mm) or add a page.
