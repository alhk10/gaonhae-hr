
## Plan: Real-time updates for Approvals tab badge count

### Root cause
The Approvals tab in `BranchDashboard.tsx` shows a badge count aggregated from many approval sources (registrations, updates, withdrawals, payment verifications, invoice/payment deletions, discount approvals, slot booking edits, grading deletions, stock transfers, inventory orders, leave/claim approvals, etc.). When a superadmin verifies/approves an entry, the underlying tables update but the dashboard's React Query caches don't refetch until manual refresh or window focus.

We previously added realtime for `student_registrations` only. The other approval sources are not subscribed.

### What I'll check
Read `BranchDashboard.tsx` to confirm the full list of query keys driving the badge count, then map each to its underlying table.

### Changes

**1. Database migration — enable realtime on all approval-source tables**
```sql
ALTER TABLE public.<table> REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.<table>;
```
For (only those not already in the publication):
- `student_update_requests`
- `student_withdrawal_requests`
- `payments` (verification)
- `invoice_deletion_requests`
- `payment_deletion_requests`
- `invoice_action_requests`
- `invoice_discount_approval_requests`
- `slot_booking_edit_requests`
- `slot_bookings_new` (booking + branch-change approvals)
- `grading_deletion_requests`
- `inventory_transfer_requests`
- `inventory_orders`
- `leave_requests`
- `claims`

**2. `src/components/dashboard/BranchDashboard.tsx`**
Extend the existing realtime channel to subscribe to all approval-source tables (filtered by `branch_id` where the column exists). On any change, invalidate the corresponding React Query keys that feed the badge counts so the Approvals tab number updates within ~1s.

**3. Mirror invalidation inside each approval list component**
For the active list rendered in the Approvals tab (the one currently open), add lightweight realtime listeners so the row disappears immediately after verification — not only the badge count.

### Result
- Verifying/approving any item anywhere immediately decrements the Approvals badge.
- The currently open approval list refreshes without manual reload.
- Works for branch-scoped views and superadmin (showAll) views.
