# Show student credit balance before/after on credit payment verification

## Current behaviour

On the superadmin dashboard Payment Verification section, a credit payment (screenshot: INV-202610-0061, ARIUS NG, $185.30, Credit, Kembangan) shows a grey "Credit payment — no proof needed" panel with no indication of how the payment affects the student's credit balance.

## How credits work (confirmed)

- A student's credit balance is the sum of `student_credits.amount` rows (`getStudentCreditBalance` in `src/services/studentCreditService.ts`).
- When a parent pays with credit on /hello, the credit is already deducted (a negative `student_credits` row) at payment time; Verify finalises it, Reject returns it.

## Change

In `src/components/dashboard/PaymentVerificationApprovals.tsx`, for credit payments (`payment_method === 'credit'`):

- Fetch the student's current credit balance for the payment's invoice student (batch: one `student_credits` query for all credit payments in the list, summed per student — same pattern as `getStudentCreditBalance`).
- Display in the credit panel (or under the student line):
  - **Balance before: $X** = current balance + this payment's amount (the credit was already deducted when the parent paid)
  - **Balance after: $Y** = current balance (what the student has left if verified)
- Example: "Credit balance: $643.10 → $457.80"
- Non-credit payments are unchanged.

## Verification

- Typecheck + build.
- Visually confirm a pending credit payment shows both balances with correct math.
