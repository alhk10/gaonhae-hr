# Block reversing credits from cancelled invoices

## What changes
- A refund credit that came from a **cancelled invoice** (e.g. Abdullah's refund from INV-202610-0104) no longer shows a **Reverse** button. The money is still on the student's account, so the credit has to stay.
- The server refuses the reversal too, so it is blocked even if the button is bypassed: "Invoice is cancelled — credit stays on account".
- **Bring back Abdullah Abdur Rahman's S$490.50 credit from INV-202610-0104.** The reversal made on 29/10 is removed, so his balance goes from S$0.00 back to S$490.50. The change is recorded in the security log.
- **Apply that credit to INV-202610-0209 again.** It now shows S$32.70 paid of S$523.20, so it is partially paid. With the S$490.50 credit restored, it becomes S$523.20 paid and settled, and his credit balance ends at S$0.00.

## Technical details
- Migration: in `admin_reverse_student_credit`, get the source invoice from `reference_id` (an invoice id, or an invoice item id mapped to its invoice). If that invoice's status is `cancelled` and the line is a positive credit (refund or overpayment), raise an exception.
- `studentCreditService.getCreditLedger`: also load invoice `status`. Pass `invoiceCancelled` into `isCreditReversible`, which returns false when the line is a positive credit from a cancelled invoice.
- Add one test case to `creditRunningBalance.test.ts` and run it.
- Data fix: delete both reversal rows in `student_credits`: `d23eede9…` (refund reversal) and `908147eb…` (applied-credit reversal). This restores the original refund (+490.50) and the applied line (-490.50) to INV-202610-0209. Re-insert the deleted S$490.50 `credit` payment on invoice `4c921c79…`, verified like the original, so `recalc_invoice_from_payments` updates the invoice. Log `credit_reversal_undone` in `security_audit_log`. Then confirm the invoice shows S$523.20 paid and the balance is S$0.00.
