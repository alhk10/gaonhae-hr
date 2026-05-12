## Auto-post journals on payment verification

The accounting integration already exists (`postPaymentJournal`, `postInvoiceIssuedJournal` in `src/services/accountingPostings.ts`) and `postPaymentJournal` is gated on `is_verified=true` for non-cash methods. However, the **Verify / Reject** actions in the dashboards update the `payments` row with raw Supabase calls and never trigger the journal builders — so verifying a payment today does not flow into journal entries until something else (e.g. an edit) re-posts.

### Fix
Wire the journal calls into both verify/reject paths so the ledger updates immediately when the verification status flips.

Files to change:
1. `src/components/dashboard/PaymentVerificationApprovals.tsx`
   - After `handleVerify` succeeds: `void postPaymentJournal(payment.id)` and, if `payment.invoice_id`, `void postInvoiceIssuedJournal(payment.invoice_id)` (status moved to `verified`).
   - After `handleReject` succeeds: `void postPaymentJournal(rejectingPayment.id)` (will void the stale payment journal because `verification_status='rejected'`) and `void postInvoiceIssuedJournal(rejectingPayment.invoice_id)` (status reverted to unpaid/partial).

2. `src/components/dashboard/BranchDashboard.tsx` (lines ~232, 257, 297)
   - Same calls after the verify and reject mutations on this screen.

### Out of scope
- No DB/schema changes. No changes to `accountingPostings.ts` or `accountingService.ts` — they already handle idempotent re-posting and voiding correctly.
- Cash payments continue to post on creation (they don't need verification).