## Problem

The Superadmin "Payment Deletion" approvals card shows the **same request twice** (identical Payment #, Invoice #, Amount, Requester, Date). This happens because nothing prevents a user from submitting the deletion-request dialog twice for the same payment — `createDeletionRequest` in `src/services/paymentDeletionRequestService.ts` simply inserts a new row each time, and `getPendingDeletionRequests` returns every pending row.

## Fix (defence in depth)

1. **DB — prevent duplicates at the source** (migration):
   - Add a partial unique index on `payment_deletion_requests`:
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS payment_deletion_requests_one_pending_per_payment
       ON public.payment_deletion_requests(payment_id)
       WHERE status = 'pending';
     ```
   - One-off cleanup of any existing duplicate pending rows (keep the most recent per `payment_id`):
     ```sql
     DELETE FROM payment_deletion_requests a
     USING payment_deletion_requests b
     WHERE a.status='pending' AND b.status='pending'
       AND a.payment_id=b.payment_id
       AND a.created_at < b.created_at;
     ```

2. **Service — `src/services/paymentDeletionRequestService.ts`**:
   - In `createDeletionRequest`, before insert, check for an existing `pending` request for the same `payment_id`. If found, return it and surface a friendly toast in the caller (`"A deletion request for this payment is already pending"`) instead of inserting a duplicate.
   - In `getPendingDeletionRequests`, dedupe defensively by `payment_id` (keep the latest by `created_at`) so the UI stays clean even if old duplicates remain.

3. **UI — no layout changes.** The existing list/table simply renders the deduped result.

## Out of scope
- No changes to approve/reject flow, no UI redesign, no changes to invoice/grading deletion request tables.
