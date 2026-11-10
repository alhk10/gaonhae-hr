# Discount after subtotal, before GST

## What changes
1. **Invoice layout (PDF and invoice previews)** now reads in this order:
   ```text
   Subtotal (before GST):   S$480.00
   Discount:               -S$20.00
   GST (9%):                S$41.40
   Total:                   S$501.40
   ```
   For Australia (GST already included), Discount still comes before the "GST included" line.
2. **All future invoices** charge GST on the subtotal *after* the discount. Most invoices already work this way, but a few (e.g. INV-202610-0204, 0036, 202609-0428, 0415) charged GST before the discount. Every place that creates or edits an invoice will use the same rule: staff invoice dialog, invoice edit/save, `/hello` checkout, auto-invoices from grading, competitions and seminars, and External Invoices.
3. **Islah's invoice INV-202610-0204** is recalculated: S$480.00 − S$20.00 = S$460.00, GST S$41.40, total **S$501.40** (was S$523.20). Her scanned payment is S$449.55, so the balance due becomes **S$51.85** and stays in the shortage list until the second payment is recorded.
4. Other past invoices stay as they are, paid or unpaid.

## Technical details
- `src/utils/invoicePDFGenerator.ts` (totals block ~L373–385) and any on-screen totals summaries in `InvoiceDialog.tsx` / `InvoiceManagementList.tsx` / `/hello` invoice views: move the Discount row between Subtotal and GST.
- Add one shared helper (`computeInvoiceTotals(subtotal, discount, rate, inclusive)`) with tests: SG `480, 20, 9%` → tax 41.40, total 501.40; AU inclusive path unchanged. Use it in `invoiceService.ts` (create ~L299) and in `InvoiceDialog.tsx` edit totals (~L1314, L1433).
- Search the SQL invoice-writing functions (`submit_public_chat_invoice`, auto-invoice triggers, `access_apply_draft_invoice_edit`, external invoice RPCs, `recalc_*`) for tax computed on the gross subtotal, and change it to `(subtotal - discount_amount) * rate` in a migration.
- One-off data fix for INV-202610-0204 only: tax_amount 41.40, total 501.40, then run `recalc_invoice_from_payments` so balance and shortage update.
- Add an `AGENTS.md` rule: GST is always calculated on subtotal after discount, via the shared helper.
