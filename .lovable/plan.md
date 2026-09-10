# Invoice PDF: show "Paid & Verified"

## What changes

On the invoice PDF, the Status line currently reads "Verified" for verified invoices. Change it to read **Paid & Verified**, keeping the same green colour. All other statuses (Paid, Unpaid, Partially Paid, Overdue, Cancelled, Refunded) stay as they are.

## Technical notes

- `src/utils/invoicePDFGenerator.ts` (~line 230): change the `statusDisplayMap` entry `'verified': 'Verified'` to `'verified': 'Paid & Verified'`. Colour logic at line 237 already covers `verified` (forest green) — no change needed.

## Verification

- Download a PDF for a verified invoice (e.g. INV-2026-00056): Status shows "Paid & Verified" in green.
