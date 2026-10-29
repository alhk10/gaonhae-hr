# Reverse credit transactions

## What you get
- A **Reverse** button on each line in Credit Management (All transactions list and the student history pop-up). Only superadmin sees it.
- Clicking it opens a confirm box with the line's details and a required reason.
- On confirm:
  - A matching opposite line is added (for example +$490.50 "Reversal of: Credit applied for INV-202610-0209 — reason"), so the student's balance goes back.
  - For **Applied** lines, the linked credit payment is also removed from the invoice, so the invoice shows that amount owing again.
  - The original line gets a "Reversed" badge and its button disappears. Reversal lines themselves can't be reversed.
- Lines still on hold or waiting for a refund decision can't be reversed; the button is hidden for them.

## Technical details
- New SECURITY DEFINER function `admin_reverse_student_credit(p_credit_id, p_reason)`:
  - Checks the caller is a superadmin on the server.
  - Locks the row and refuses a second reversal, using `reference_id = 'reversal:<id>'` as the idempotency key.
  - Inserts the opposite `manual_adjustment` row, with `created_by` set to the caller's email.
  - For `credit_applied`, deletes the matching `payment_method = 'credit'` payment on that invoice (same amount, the most recent if there are several). The existing payment triggers then recalculate the invoice.
  - Writes an entry to the security audit log.
- `getCreditLedger` marks a row as reversed when a `reversal:<id>` row exists. `CreditLedgerTable` gets an optional `onReverse` prop.
- A small test checks the rule that reversed and reversal rows are not reversible.
