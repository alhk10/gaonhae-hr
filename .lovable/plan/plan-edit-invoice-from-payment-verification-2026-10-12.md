# Plan: Edit invoice from Payment Verification

## Goal
Let superadmin open and edit the full invoice directly from a Payment Verification card, so a mismatched payment (e.g. proof shows $190.75 against a $572.25 invoice) can be resolved by fixing the invoice itself — not just the payment amount.

## Changes

### 1. Payment Verification card (`src/components/dashboard/PaymentVerificationApprovals.tsx`)
- Add an **Edit Invoice** button next to the existing Edit / Reject / Verify buttons on each payment row.
- Clicking it opens the existing unified `InvoiceDialog` (`src/components/sales/InvoiceDialog.tsx`) in `mode="edit"` with the payment's `invoice_id` — the same dialog already used on the branch dashboard, with the full Create Invoice layout (line items, terms, discounts, GST).
- The existing **Edit** button (payment amount only) stays — it covers the simpler case where the invoice is right and only the received amount needs correcting.

### 2. After saving
- When the invoice dialog closes after a save, refresh the Payment Verification list and re-run the existing `recalcInvoice` logic so the payment row reflects the new invoice total (amount paid, balance, status).
- No changes to verify/reject flows, proof display, or the screenshot-scan badge.

## Technical notes
- `InvoiceDialog` already accepts `mode: 'create' | 'view' | 'edit'` and `invoiceId`, and handles edit-mode totals, tax inclusion by branch country, and change logging — it is reused as-is, no fork.
- This section only renders for signed-in superadmin, so the dialog's authenticated saves work; no new RPC needed.
- Editing a paid/verified invoice still follows the existing approval rules inside `InvoiceDialog`; the payments here are pending verification, so their invoices are typically unpaid/partially paid and directly editable.

## Verification
- Typecheck + build.
- Confirm the Edit Invoice button opens the dialog preloaded with the invoice's items and totals.
