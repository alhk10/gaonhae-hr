# Fix invoice preview on phones

## Cause
On Android phones the browser cannot show a PDF inside the invoice popup, so it displays a grey box with a random file code and an "Open" button instead of the invoice. The invoice itself is fine (Download PDF works).

## Fix
- Draw the invoice pages as images inside the popup, so the invoice shows on phones, tablets and computers alike.
- Keep Download PDF and Open / Print buttons as they are.
- Apply the same fix to the School Fees invoice preview, which uses the same method.

## Verify
- Open INV-202610-0003 in a phone-sized screen and confirm the invoice pages display; confirm download still works.

## Technical details
- Add `pdfjs-dist`; new `PdfPagesPreview` component renders each page of the blob to a `<canvas>` (worker via Vite `?url` import), scaled to container width.
- Replace `<iframe>` in `InvoiceDetailDialog.tsx` and `SchoolFeesTab.tsx` with `PdfPagesPreview`.
