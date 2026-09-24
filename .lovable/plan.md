# Fix refund-as-credit requests

## What is wrong
The refund dialog correctly submits an `item_refund` request, but the database rule on invoice action requests still accepts only `adjustment` and `cancellation`. The insert is therefore rejected before it can reach the superadmin approval list.

## Changes
1. Update the database rule to accept the four action types already supported by the application: `adjustment`, `cancellation`, `item_refund`, and `credit_refund`.
2. Keep the existing approval workflow unchanged: staff and `/access` users submit a request, while only a superadmin can approve or reject it.
3. Test both submission paths:
   - `/access` refund-as-credit through the existing secure public request function.
   - Signed-in staff refund-as-credit through the normal action-request service.
4. Confirm the created request retains all selected invoice line IDs and appears in the superadmin approval list.
5. Run the database security checks and confirm the preview builds cleanly.

## Technical details
- Apply the constraint correction through a Supabase schema migration.
- No invoice, payment, refund, or student-credit amounts will be changed by the migration.
- Existing invoice status restrictions remain: only paid, verified, or partially paid invoices can be submitted for line-by-line credit refunds.
