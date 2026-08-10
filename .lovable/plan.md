# Record payment while creating an invoice

Add an optional payment section to the Create New Invoice dialog so staff can raise the invoice and record the payment in one step, and let superadmins record payments without uploading proof.

## What changes for the user

**Create New Invoice dialog (Invoices & Payments tab)**
- New "Record payment now" toggle below the totals block, off by default.
- When switched on, a compact row appears with:
  - Amount (pre-filled with the invoice total, editable)
  - Payment date (defaults to today)
  - Payment method (same list as the existing payment dialog, branch-country aware default)
  - Reference number (optional)
  - Proof of payment upload
- The main button label becomes "Create Invoice & Record Payment" when the toggle is on.
- On submit: the invoice is created first, any student credit is auto-applied as today, and the payment is recorded against the remaining balance. A single success toast confirms both. If the payment step fails, the invoice stays created and the error names the payment as the failed part.
- Overpayment behaves as it does today: the excess becomes student credit, after a confirmation prompt.

**Proof of payment**
- Superadmins: proof is optional everywhere a payment is recorded (the new in-invoice section and the existing Record Payment dialog). The upload field stays available and is labelled "optional".
- Everyone else: unchanged — proof stays mandatory for non-cash methods, optional for cash, images only.

**Where the toggle does not appear**
- Only in create mode, and only when the invoice is being created directly (not when it is routed into a discount / exception / grading-prerequisite approval request — those produce no invoice to pay against, so the toggle is hidden with a short note if such a condition is detected on submit).

## Technical notes

- `src/components/sales/InvoiceDialog.tsx`
  - New create-mode state: `recordPayment`, `paymentAmount`, `paymentDate`, `paymentMethod`, `paymentReference`, `paymentProofFile`.
  - Reuse `PaymentInfoDisplay` / `ProofOfPaymentUpload` and the payment-method loading logic already used by `CreatePaymentDialog` (fetch active `payment_methods`, hide `cash` in student portal contexts, default by branch country).
  - In `handleSubmit`, after `createInvoice` and the existing credit auto-apply block: upload the proof to the `payment-proofs` bucket under `<invoice_id>/<timestamp>.<ext>` when a file is present, then call `createPayment` with the entered amount (default = total minus credit applied).
  - Validation: amount > 0; proof required only when `!isSuperadmin && method !== 'cash'`.
- `src/components/sales/CreatePaymentDialog.tsx`
  - Gate the `Please upload proof of payment` check and the `required` prop on `ProofOfPaymentUpload` behind `!isSuperadmin` (read `userrole` from `useAuth`, same as InvoiceDialog).
- No database or RLS changes; `createPayment` already recalculates invoice status and credits.
