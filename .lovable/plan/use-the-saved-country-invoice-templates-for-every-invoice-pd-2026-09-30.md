# Use the saved country invoice templates for every invoice PDF

## Outcome
Invoice previews, downloads and emailed PDFs use the existing active Singapore or Australia invoice template according to the invoice’s branch, including its letterhead, payment instructions, QR code, notes and footer. Past invoices use the same correct template whenever opened again; invoice amounts and statuses are not changed.

## Changes
1. Centralize branch-to-country template selection so invoice PDF entry points cannot silently fall back to the generic Singapore header or select a template for the wrong country. Handle a missing/inactive template with a clear error rather than printing incorrect business details.
2. Include the invoice branch country in the public invoice detail returned to `/access`; load the correct existing template for public invoice previews and School Fees invoice previews. Preserve the existing public access behavior.
3. Apply the same template fields consistently to staff invoice downloads/email, student portal downloads, and `/hello` past-invoice downloads. Use the template’s configured branding and bank instructions rather than the current hardcoded logo/header when appropriate.
4. Review page layout with both countries’ real template data, especially the logo/letterhead/title spacing, bank information, QR code, refunded lines and page breaks; keep the established invoice formatting and country GST treatment.

## Technical details
- The shared generator is `src/utils/invoicePDFGenerator.ts`. Its fallback currently uses a hardcoded Singapore company header and `/images/company-logo.jpg`; some callers already fetch templates while public invoice detail currently provides branch name/address but not country or template.
- Reuse `invoice_templates` by active country (`SG`/`AU`); extend existing SECURITY DEFINER invoice-detail RPC output only as needed for branch identification, then resolve template through the existing permitted access path. Avoid client-side exposure of unrelated invoice data.
- Verify preview, download and email PDF paths against representative Singapore and Australian invoices, including a refunded invoice; inspect rendered PDFs for clipping or overlapping text.
