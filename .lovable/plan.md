# Student credits: manual top-up, visible in Hello, used first

Three linked changes: superadmins can add credit to any student, students see their credit in the Hello chat, and credit is automatically used to reduce what they pay.

## 1. Credit Management — superadmin can add credit to any student

- A new **Add credit** button at the top opens a student search (by name or student number) covering every student, not just those who already hold credit.
- Amount and reason are required; the entry appears immediately in the student's history and in the balance list.
- Adding credit and issuing refunds become **superadmin only**. Other staff keep read-only access to balances and history — the add/refund buttons are hidden for them.

## 2. Hello chat — show available credit

- Right after the student is recognised (e.g. "ANISSA KOH · 01/01/2012 · Bukit Merah"), a line shows their available credit when it is above zero, for example: "You have $45.00 in credit available."
- Available means balance minus any credit already placed on hold for an unverified payment.
- Nothing is shown when the balance is zero.

## 3. Credit used first at payment

- On the payment step, credit is applied automatically before anything is charged:
  - "Credit used: $45.00 — remaining credit after this: $0.00"
  - "Amount to pay: $30.00"
- If credit covers the whole amount, the screen says **no payment needed** and shows the credit used and the credit remaining. No payment method or proof is requested; the student just confirms.
- The credit used is put **on hold** at that moment, so it cannot be spent twice. It is only consumed once staff verify the submission; if the submission is rejected or deleted, the hold is released and the credit returns.
- The invoice shows the credit as a settling amount: the full items and total stay as-is, with a credit entry reducing the balance due, and the remaining balance covered by the student's payment.

## Technical notes

- `student_credits.type` check constraint extended with `credit_hold` and `credit_hold_released`; holds are negative rows carrying the invoice id in `reference_id`.
- New `public.get_student_available_credit(uuid)` = sum of all rows (holds included). `studentCreditService.ts` gains `getAvailableCredit` and `addCreditForStudent`.
- `submit_public_chat_invoice` (SECURITY DEFINER): compute available credit, `v_credit_used := least(available, v_paid_total)`; insert a `credit_hold` row; record a `credit` payment row for `v_credit_used` (`verification_status = 'pending_verification'`) and the paynow/bank payment row for the remainder only; allow `p_payment_method` to be null/`credit` and `p_proof_url` null when the remainder is zero.
- Verification path (`_resolve_chat_submission_invoice` callers / chat submission verify RPCs): on verify, convert the hold to `credit_applied`; on reject, insert a `credit_hold_released` positive reversal.
- Public read of the balance goes through a session-validated RPC (`get_public_chat_student_credit(p_session_id, p_student_id)`) — no direct table access from the browser.
- `PublicHelloChat.tsx`: fetch available credit alongside the student summary; render the credit line under the recognition message and the credit/remaining breakdown plus the no-payment-needed variant on the payment step.
- `CreditManagement.tsx`: `userrole === 'superadmin'` from `AuthContext` gates add/refund; new student-search dialog backed by a name/number search on `students`.
