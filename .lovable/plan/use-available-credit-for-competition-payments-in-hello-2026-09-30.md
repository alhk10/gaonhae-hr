# Use available credit for competition payments in /hello

## Problem
In /hello, School Fees and Grading payments go through the shared payment screen, which deducts the student's credit first (shows "Credit applied", lowers the amount to pay, and allows "Confirm using credit" when fully covered). The new **Register for Competition** form is a separate form and ignores credit, so Evan was asked to pay the full $239.80.

## What changes
1. **Competition form in /hello shows credit**
   - Under the Subtotal / GST / Total box: "Credit applied −$X", "Amount to pay $Y", "Credit remaining $Z" — same wording and styling as the fees payment screen.
   - Submit button reads "Submit Payment ($Y)", or "Confirm using credit" when credit covers everything.
   - When fully covered, payment method and proof upload are hidden and not required.
   - Credit is re-read when the form opens so the figure is current.
2. **Credit is actually held and used**
   - On submit, the credit amount is reserved against the competition submission (same hold mechanism used by fees/grading), and the proof amount check compares against the amount to pay, not the full total.
   - When the submission is verified and matched, the invoice shows the full total with the credit applied as a payment, so the balance is correct.
   - If the submission is rejected or deleted, the held credit is released back to the student.
   - Credit-only submissions are treated like credit-only fee payments (auto-verified once matched to the recognised student).
3. **Standalone /comps unchanged** — no student is recognised there, so no credit is applied.
4. **Consistency check across /hello** — confirm every payment path (School Fees, Grading, Competition) uses the same credit rule: credit applied first, up to the total, shown before paying, and reflected on the invoice. Fix any path that differs.

## Technical details
- `CompetitionRegistrationForm`: new optional props `sessionId`, `studentId`, `availableCredit` (passed only from `PublicHelloChat`); compute `creditToUse / amountDue / fullyCoveredByCredit` identical to the payment screen.
- Extend competition submission (SECURITY DEFINER RPC) with `p_session_id`, `p_credit_amount`; server re-validates credit via the same logic as `get_public_chat_student_credit`, caps it to total, and records the hold linked to the submission. Client value is never trusted.
- Update competition auto-invoicing to apply the held credit as a credit payment on the invoice; release hold on reject/delete RPCs.
- Proof scan advisory uses `amountDue`.
- Verify with typecheck/build and a Playwright check that Evan's /hello competition form shows his credit deduction (no real submission).
