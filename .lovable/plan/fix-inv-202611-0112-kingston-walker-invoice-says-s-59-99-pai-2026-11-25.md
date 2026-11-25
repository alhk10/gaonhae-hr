# Fix INV-202611-0112 (Kingston Walker): invoice says S$59.99 paid, payment says S$60

## What's happening
- The invoice is for 2 Limited Edition Christmas T-shirts. It was created on 24/11 at S$59.99 (the old rounding bug) and was corrected to S$60.00 on 25/11.
- The payment was entered as S$60.00 (PayNow), but the automatic proof check read the screenshot as **S$59.99**.
- When the proof shows less than the payment amount, the app treats it as a possible underpayment and only counts what the proof shows. So the invoice shows Paid S$59.99, Balance S$0.01, "partially paid", and it waits for a superadmin to sort out the shortage.
- So the 1 cent comes from what the proof check read, not from the invoice maths. It's likely the parent really paid S$59.99, since that was the invoice total when they got it.

## Fix
1. Open the proof screenshot as superadmin and check the amount.
2. **If it shows S$60.00:** correct the scanned amount to S$60.00. The invoice becomes fully paid with S$0 balance, and the payment can be verified.
3. **If it shows S$59.99:** the parent paid the amount we originally charged, so write off the 1 cent. Settle the shortage through the existing superadmin "resolve shortage" step, so the payment counts as S$60.00 and the invoice shows fully paid. Nothing goes to student credit and no new invoice is created.
4. Check that the invoice and the payment both show S$60.00 and the invoice shows paid.

## Not changing (tell you only)
Two other invoices have a few cents' gap from the same kind of proof mismatch. They're pending your call and I won't touch them:
- INV-202610-0091: S$457.84 due, proof S$457.80
- INV-202610-0099: S$545.04 due, proof S$545.00

## Technical details
- Data: `payments` ee9704f3… has `proof_scan_amount` 59.99 and `proof_scan_status` mismatch. `recalc_invoice_from_payments` counts only the scanned amount while the shortage is unresolved.
- Step 2: run_sql update `proof_scan_amount`=60 and status `match`, then call `recalc_invoice_from_payments`.
- Step 3: use `admin_resolve_payment_shortage` (accept) or the equivalent data update, then recalc.
- No code change. The rounding bug that created S$59.99 was already fixed on 25/11.
