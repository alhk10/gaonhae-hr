# Auto-verified payments update their invoice like a manual Verify

## What happens today
When a screenshot matches, the payment is marked Verified, but the invoice keeps its old paid amount, balance and status (e.g. "draft"). A database rule already tries to sync the invoice. It skips draft invoices, though, and it uses the invoice's stored paid amount instead of adding up the payments.

## What changes
When a payment verifies itself, the system does the same steps as pressing Verify:
1. Recalculates the invoice's amount paid and balance from all payments that weren't rejected.
2. Sets the status: unpaid / partially paid if money is still owed, Paid if fully paid but some payments still need checking, Verified when every payment is verified. Draft invoices are moved on too, exactly as a manual Verify does.
3. Settles any student credit that was held for that invoice (the same step as manual Verify).
4. Posts the payment and invoice to the accounts, the same way a manual Verify does.

Cancelled invoices are never touched.

The two invoices from earlier are fixed right away:
- INV-202610-0145 (Hui Wen Low): becomes **Verified**.
- INV-202610-0112 (Alex Koshimizu): the invoice total is $545.96 but $545.90 was paid. It becomes **Partially paid** with $0.06 owing, which is what a manual Verify would show too.

## Technical details
- Migration: in `auto_verify_matched_scan_payment`, when it flips a row to verified, it also stamps pending credit-method rows on the same invoice (as `handleVerify` does). A new AFTER UPDATE trigger on `payments` (when `verified_by = 'auto_scan'` just changed to verified) calls `consume_credit_hold(invoice_id, 'auto_scan')`, then recalculates `amount_paid` / `balance_due` / `status` with the same formula as `recalcInvoice`, including draft invoices and skipping cancelled ones.
- `scan-payment-proof` server mode: after saving results, for each payment that ended up verified, it posts accounting journals using the same logic the client's `postPaymentJournal` / `postInvoiceIssuedJournal` use. It reuses the existing RPCs if those services call them. Otherwise the Payment Verification catch-up posts them client-side for rows returned as "match".
- Backfill: run the recalculation once for the two invoices above, plus any other invoice whose payments were auto-verified but whose status is out of date.
- Add a small test for the status formula (unpaid / partially paid / paid / verified).
