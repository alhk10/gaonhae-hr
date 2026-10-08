# Invoice Action Approvals: open invoice and show payment proof

## What changes
On the Superadmin Dashboard, each request in **Invoice Action Approvals** (Item Refund, Cancel, Credit Refund, Overpayment → Credit) will:
- Make the **invoice number clickable**. Tapping it opens the invoice so you can see it and download the PDF, the same way it works in /access.
- Show **payment proof thumbnails** for every payment on that invoice, plus any extra proofs. Tap a thumbnail to see the full image. If there's no proof (for example, a cash payment), it shows "No proof".

This works the same on phone cards and the desktop table. The approve and reject buttons don't change.

## Technical details
- `InvoiceActionApprovals.tsx`: add one query that loads `payments` (`invoice_id`, `proof_of_payment_url`, `extra_proofs`, `amount`, `payment_method`) for every `invoice_id` in the pending requests, grouped by invoice.
- Show the thumbnails with `SignedImagePreview` (thumb `h-14`). Private `/hello` proof paths get temporary signed links through the existing signing helpers.
- The invoice number becomes a link-style button that opens `InvoiceDetailDialog` (`getPublicInvoiceFull` + `PdfPagesPreview`), which already works on Android.
- No database changes.
