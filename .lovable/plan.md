# Pay with student credit

## What changes
- In **Record Payment** (both the signed-in staff dialog and the `/access` dialog), a **Student credit (S$x available)** option appears in Payment Method whenever the invoice's student has credit above S$0.
- Choosing it:
  - prefills the amount with the smaller of available credit and balance due, and caps it there
  - hides the PayNow QR, bank details and proof upload (none needed)
  - shows "Credit after payment: S$x"
- On save, the payment is recorded and verified immediately, the credit balance goes down by the same amount, and the invoice updates (paid / partially paid). It appears in the student's credit history as "Applied to INV-…".
- Example: Islah's INV-202610-0204 has S$16.35 due and S$16.35 credit; choosing Student credit clears it to paid, with S$0.00 credit left.

## Technical details
- New SECURITY DEFINER function `apply_student_credit_to_invoice(p_invoice_id, p_amount, p_client_ref, p_password default null)`:
  - access check: signed-in staff/superadmin, or `/access` password whose scope covers the invoice branch (`_access_scope`/`_scope_has`)
  - locks the student's credit rows; amount must be > 0 and ≤ `get_student_available_credit` and ≤ balance due
  - inserts a verified `payments` row (`payment_method='credit'`, idempotent on `client_ref`) and a negative `student_credits` row (`type='applied'`, `reference_id` = invoice id); existing payment triggers recalculate the invoice
  - writes an `invoice_change_logs` entry
- `CreatePaymentDialog.tsx` and `AccessRecordPaymentDialog.tsx`: add the conditional `credit` option and call the new function instead of the normal insert when selected.
- Small test: amount is capped at min(credit, balance), e.g. credit 16.35 / due 16.35 → 16.35; credit 50 / due 16.35 → 16.35; credit 10 / due 16.35 → 10.
