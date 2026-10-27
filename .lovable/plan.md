# Rental deposit refunded button

## What you'll see
- On studio rental invoices in `/access` (External Invoices and Studio Rental tabs), any paid invoice that has a "Refundable rental deposit" line gets a **Deposit refunded** button.
- Clicking it asks for confirmation (amount, refund date, optional note).
- On confirm, a new line **"Rental deposit refunded"** is added to the same invoice with the negative deposit amount (e.g. -$100), so the deposit nets to $0. The original deposit line stays visible.
- The invoice total drops by the deposit, and the deposit refund is recorded as money paid back, so the balance stays $0.00 and no student/customer credit is created.
- After refunding, the button changes to a grey **Deposit refunded DD/MM/YYYY** badge and can't be pressed again. It also shows on the invoice PDF line items.

## Who can use it
- Only the all-branch password (Hp97533488), the same users who can see Studio Rental and External Invoices.

## Technical details
- New password-checked database function `access_refund_rental_deposit(password, invoice_id, refund_date, note)`:
  - Finds the invoice's `studio_rental` deposit line; refuses if none, if already refunded (`metadata.deposit_refund` line exists), or if the invoice isn't paid.
  - Inserts a negative `invoice_items` row (`metadata: {deposit_refund: true, studio_rental_id}`), plus a negative verified refund payment for the same amount, then calls `recalc_invoice_from_payments` so total, paid and balance stay consistent and no overpayment credit is triggered.
  - Logs to `invoice_change_logs`.
- Frontend: button + confirm dialog in `ExternalInvoicesTab` / `StudioRentalTab`, service wrapper in `studioRentalService.ts`.
- One test for the "already refunded / no deposit" guard logic.
