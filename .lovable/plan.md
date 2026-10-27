# Record Payment button on invoice view

## What you'll see
- A **Record Payment** button in the invoice popup, next to Edit / Delete / Open-Print / Download PDF.
- Shown only when the invoice still has a balance (not paid in full, cancelled or refunded).
- Opens a payment form pre-filled with this invoice: amount defaults to the balance due, date defaults to today, method defaults to PayNow (Singapore) / bank transfer (Australia), optional reference, notes and proof image (images only, PDFs rejected; optional for cash).
- After saving, the invoice popup refreshes so the status and PDF show the payment (paid / partially paid). Overpayments still follow the existing turn-into-credit prompt.
- Works the same in `/access` (branch passwords stay limited to their own branches) and for signed-in staff.

## Rules kept
- Payments recorded by staff follow the usual verification flow (non-cash shows as pending until verified; invoice totals update immediately as today).
- Branch passwords can only record payments on invoices of their branch(es).

## Technical details
- `InvoiceDetailDialog.tsx`: add button; signed-in users open existing `CreatePaymentDialog` with `preSelectedInvoiceId`; `/access` password sessions use a new compact form.
- New password-gated SECURITY DEFINER RPC `access_record_payment(p_password, p_invoice_id, p_amount, p_date, p_method, p_reference, p_notes, p_proof_url, p_client_ref)` checking `_access_scope`/`_scope_has` against the invoice branch, inserting into `payments` (existing trigger runs `recalc_invoice_from_payments`), idempotent on `client_ref`.
- Proof upload reuses the existing payment-proof storage path with unique filenames.
- Reload invoice detail and PDF after success (bump `reloadKey`).
