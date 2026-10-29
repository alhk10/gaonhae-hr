# Block reversing credits from cancelled invoices

## What changes
- A refund credit that came from a **cancelled invoice** (e.g. Abdullah's refund from INV-202610-0104) no longer shows a **Reverse** button. The money is still on the student's account, so the credit has to stay.
- The server refuses the reversal too, so it is blocked even if the button is bypassed: "Invoice is cancelled — credit stays on account".
- **Bring back Abdullah Abdur Rahman's S$490.50 credit from INV-202610-0104.** The reversal made on 29/10 is removed, so his balance goes from S$0.00 back to S$490.50. The change is recorded in the security log.
- Invoice INV-202610-0209 stays as it is now, with no credit applied. That separate reversal is left alone. The restored credit will be used automatically on his next invoice, or I can apply it to 0209 if you want.

## Technical details
- Migration: in `admin_reverse_student_credit`, get the source invoice from `reference_id` (an invoice id, or an invoice item id mapped to its invoice). If that invoice's status is `cancelled` and the line is a positive credit (refund or overpayment), raise an exception.
- `studentCreditService.getCreditLedger`: also load invoice `status`. Pass `invoiceCancelled` into `isCreditReversible`, which returns false when the line is a positive credit from a cancelled invoice.
- Add one test case to `creditRunningBalance.test.ts` and run it.
- Data fix: delete `student_credits` row `d23eede9-f0c0-4c7b-82b2-b1aa9fb9d7c9` (reversal of refund `71d9e7bc…`). Insert a `security_audit_log` entry `credit_reversal_undone`. Then confirm the balance reads S$490.50.
