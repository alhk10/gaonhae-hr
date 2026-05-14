## Problem

Asher's payment (PAY-202605-0006 on INV-2026-00302) was rejected, but the invoice still shows `paid` with `amount_paid=0`, `balance_due=0`. It should be `unpaid` with `balance_due=235`.

## Root cause

`handleRejectPayment` in `src/components/dashboard/BranchDashboard.tsx` reads `rejectingPayment.invoices?.total_amount` to recompute the invoice. But the branch payments query (line 793) does NOT select `total_amount`:

```
.select('*, invoices!inner(invoice_number, branch_id, students(...))')
```

So `invoiceTotal` evaluates to `0` → `balanceDue = max(0, 0 - 0) = 0` → `status = 'paid'`. The invoice gets stamped paid even though the payment was rejected.

The superadmin `PaymentVerificationApprovals.tsx` already selects `total_amount`, so it's only the BranchDashboard reject path that's broken.

## Fix

1. **`src/components/dashboard/BranchDashboard.tsx`**
   - Line 793: add `total_amount, status` to the invoices sub-select.
   - In `handleRejectPayment`, as a defensive measure, fetch the invoice total fresh from `invoices` before recomputing (covers any stale cached row).

2. **Data backfill (migration)** — restore Asher's invoice:
   ```
   UPDATE invoices
     SET amount_paid = 0, balance_due = total_amount, status = 'unpaid'
     WHERE id = 'e0beaa07-73b5-40b0-8c79-bc52ba8216c4';
   ```
   Then re-post journals via the existing accounting backfill flow (no code change needed; payment journal will be reversed automatically by `postPaymentJournal` since `verification_status='rejected'`).

3. **Sweep** for any other invoices in the same broken state (rejected payment but invoice still `paid`) and apply the same correction:
   ```
   UPDATE invoices i SET amount_paid = ..., balance_due = ..., status = ...
   WHERE i.id IN (
     SELECT DISTINCT p.invoice_id FROM payments p
     WHERE p.verification_status = 'rejected'
       AND NOT EXISTS (
         SELECT 1 FROM payments p2
         WHERE p2.invoice_id = p.invoice_id
           AND COALESCE(p2.verification_status,'') <> 'rejected'
       )
       AND i.id = p.invoice_id
       AND i.status IN ('paid','verified','partially_paid')
   );
   ```
   Recompute per invoice based on remaining non-rejected payments.

## Out of scope

No UI/layout changes; no schema changes; no changes to the superadmin verification dialog (already correct).
