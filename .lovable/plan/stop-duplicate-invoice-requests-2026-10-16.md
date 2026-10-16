# Stop duplicate invoice requests

## What went wrong
INV-202610-0104 (ABDULLAH ABDUR RAHMAN) had two refund requests for the same "Little Gaonhae 1x Weekday" line: one sent at 15:05 and another at 15:18. The second one was approved and the item was refunded. The first one is still waiting, so approving it now fails with "This item has already been refunded".

## Changes
1. **Block repeat requests.** A request is refused while one is already waiting for the same invoice and the same kind of action (edit, cancel, delete, credit refund). For refunds, it is refused when the same line item is already waiting. Staff see "A request is already pending for this invoice/item" instead of a second entry being sent. This applies to the branch dashboard, /access and /hello.
2. **Hide the button while waiting.** Refund, Cancel, Edit and Delete show "Pending approval" (disabled) when a matching request is already waiting.
3. **Old requests close themselves.** If a waiting request is no longer possible (item already refunded, invoice already cancelled or deleted), Approve marks it "superseded" and removes it from the list instead of showing an error.
4. **Clean up now.** Close the leftover 15:05 request on INV-202610-0104, plus any other waiting requests already covered by an approved one.

## Technical notes
- Add a BEFORE INSERT validation trigger on `invoice_action_requests` (pending, same invoice_id + action_type; for `item_refund`, overlapping `request_data.item_ids`) and on `invoice_deletion_requests` (pending, same invoice). It raises a clear message.
- Allow status `superseded` in the status check. `InvoiceActionApprovals` catches "already refunded/cancelled" errors and sets that status. The pending queries already filter on `pending`.
- `InvoiceDialog` refund and cancel controls check pending requests through the existing `get_invoice_pending_requests` RPC, extended to return the item ids that already have a pending refund.
- Add a one-off data fix through the data tool for the stale INV-202610-0104 request and any similar leftovers.
