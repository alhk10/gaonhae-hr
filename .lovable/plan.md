# Add "Refund as credit" to the invoice details window

## What you'll see
- A new **Refund as credit** button next to Edit and Delete in the invoice window (the one showing the PDF preview, used across /access lists and dashboards).
- It appears only on paid, verified or partly paid invoices that belong to a student. External-customer invoices don't get it, since they have no credit balance.
- Clicking it opens the existing refund window. You tick the lines to refund, set a quantity for products, and enter a reason.
  - Superadmin: the refund happens straight away. The amount goes to the student's credit, and the existing invoice is updated (or cancelled if fully refunded). No new invoice is created.
  - Other staff and password-only /access users: it is sent to a superadmin for approval, as refunds work today.
- If a refund is already waiting for approval on that invoice, the button reads "Refund pending" and is disabled. This blocks duplicate requests.
- After a refund, the invoice preview reloads to show the refunded lines and the credit amount.

## Technical details
- `src/components/grading-list/InvoiceDetailDialog.tsx`:
  - Add a `RefundAsCreditDialog` with `invoiceId`.
  - Pass `publicMode={!signedIn}` so password-only staff go through the public approval request.
  - `onRefunded` reloads the dialog (`reloadKey`) and calls `loadPending`.
- Visibility: `isPaid && detail.student_id`.
- Read the pending-refund flag from `get_invoice_pending_requests`. If it doesn't return one yet, extend the function to include `refund_pending` from pending item-refund requests in `invoice_action_requests`.
- No changes to the refund logic itself; this reuses the shared refund flow.
