# Block reversing credits from cancelled invoices

## What changes
- A refund credit that came from a **cancelled invoice** (e.g. Abdullah's refund from INV-202610-0104) no longer shows a **Reverse** button. The money is still on the student's account, so the credit has to stay.
- The server refuses the reversal too, so it is blocked even if the button is bypassed: "Invoice is cancelled — credit stays on account".
- Reversals already made (like Abdullah's on 29/10) are not undone automatically. I can repair them as a separate step if you want.

## Technical details
- Migration: in `admin_reverse_student_credit`, get the source invoice from `reference_id` (an invoice id, or an invoice item id mapped to its invoice). If that invoice's status is `cancelled` and the line is a positive credit (refund or overpayment), raise an exception.
- `studentCreditService.getCreditLedger`: also load invoice `status`. Pass `invoiceCancelled` into `isCreditReversible`, which returns false when the line is a positive credit from a cancelled invoice.
- Add one test case to `creditRunningBalance.test.ts` and run it.
