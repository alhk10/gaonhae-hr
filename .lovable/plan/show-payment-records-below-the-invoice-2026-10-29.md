# Show payment records below the invoice

## What you will see
Under the invoice preview in the invoice details window, a new **Payments** section lists every payment on that invoice, oldest first:
- Date, method (cash, PayNow, bank transfer, credit), amount and reference
- Status badge (verified, pending, shortage, rejected)
- Proof thumbnail(s) that open a larger view
- A line for credits applied, and any refunds or reversals shown as negative amounts
- Footer totals: Paid, Pending, Balance due

If there are no payments, it shows "No payments recorded". The list refreshes after **Record Payment**, a refund or an edit.

## Access
- Signed-in staff and superadmin read the payments directly, using the existing permissions.
- `/access` password users get the list through a new password-checked lookup. It returns payments only for invoices inside that password's branch scope.

## Technical details
- New migration: SECURITY DEFINER `access_invoice_payments(p_password text, p_invoice_id uuid)`.
  - Validates the password with `_access_scope` and the invoice branch with `_scope_has`.
  - Returns id, payment_date, amount, payment_method, reference_number, status, proof_url, extra proofs, shortage fields and created_at, ordered by date.
  - Grants execute to anon and authenticated.
- New `InvoicePaymentsList.tsx` in `grading-list`, rendered in `InvoiceDetailDialog.tsx` below `PdfPagesPreview`.
  - Uses the RPC when signed out, or a `payments` select when signed in.
  - Uses `SignedImage` for proofs and `formatDate` for dates.
  - Formats amounts with the invoice country's currency.
  - Refetches on `reloadKey`.
- Verify by opening INV-202610-0212 in `/access` and confirming the payment row and proof appear.
