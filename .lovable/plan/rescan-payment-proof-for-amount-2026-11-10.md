# Rescan payment proof for amount

## What you'll get
In an invoice's **Payments** list, each payment with a proof image gets a new **Rescan** icon (next to the eye and bin).

Pressing it re-reads the screenshot and shows what it found, for example:
"Proof shows S$147.15 · Recorded S$49.05".

- **Amounts match:** you see a green "Matches" note. Nothing else changes.
- **Amounts differ:** you get an **Update payment to S$147.15** button.
  - Superadmin or the all-branch password: the change applies straight away. The invoice is recalculated, and anything paid above the invoice total becomes student credit, using the existing credit flow.
  - Branch staff: the change goes to superadmin for approval, like other paid-invoice changes.
- **Image can't be read:** you see "Couldn't read amount". Nothing changes.

Every rescan and every amount change is saved with who did it and when.

Example: Kaden's payment PAY-202610-0179 was recorded as S$49.05, but his screenshot shows S$147.15, which is the full invoice. Updating it would clear his S$98.10 balance.

## Technical notes
- Edge function `scan-payment-proof`: add a `rescan_payment_id` mode. It ignores the current "unscanned/unverified only" filters, re-reads the stored proof, overwrites `proof_scan_status/amount/details` (`source: "rescan"`), and returns the scanned and recorded amounts.
- New SECURITY DEFINER RPC `access_apply_scanned_amount(p_password, p_payment_id)`. It applies `proof_scan_amount` as the payment amount and logs the change to `payment_amount_corrections`. The existing payment triggers handle invoice recalculation, auto-verification and overpayment credit. Superadmin and all-branch callers apply directly; branch-scoped callers create an `invoice_action_requests` approval.
- UI: a `ScanSearch` icon button in the payment rows in `InvoiceDialog.tsx` (and in the `/access` invoice detail payment rows if they are separate), with a small result popover.
