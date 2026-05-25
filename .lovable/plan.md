## Zero-balance invoices skip payment

**Problem:** Invoice with total $0 / balance $0 (fully discounted) still shows the Record Payment dialog. There's nothing to pay.

### Changes

**`src/components/dashboard/BranchDashboard.tsx`**
- In the invoice row action bar (~line 1743), tighten the condition that renders the `$` payment button so it also requires `(invoice.balance_due ?? 0) > 0`. Fully-discounted invoices stop showing the payment trigger.
- When a draft/sent/unpaid invoice has `total_amount <= 0` and `balance_due <= 0`, treat it as settled: update its status to `'paid'` (no payment row needed) as part of the existing invoice load/normalisation logic that already runs `update({ amount_paid, balance_due, status })` (~line 333). Add a small guard there: if `total_amount <= 0`, force `status = 'paid'`, `balance_due = 0`. This makes the badge read `paid` instead of `draft` and removes it from outstanding metrics.

**`src/components/sales/InvoiceManagementList.tsx`** (Sales > Invoices list)
- Mirror the same `balance_due > 0` guard on its `$` Record Payment button so zero-balance rows don't expose the action there either.

No backend/schema changes. No change to CreatePaymentDialog itself (still works if opened from other surfaces with a non-zero balance).