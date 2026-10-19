# Left-align PayNow QR with bank transfer details

On the invoice PDF, the QR currently hugs the right page edge while the "Bank Transfer:" text starts further left. Move the QR so its left edge lines up with the bank transfer text.

## Technical details
- `src/utils/invoicePDFGenerator.ts` (~L484): change QR x from `pageWidth - margin - size` to `rightColumnX`. Size and footer-fit logic unchanged.
