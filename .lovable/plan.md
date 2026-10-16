# Edit and Delete buttons on the invoice viewer (with superadmin approval)

## What changes
The invoice viewer that opens when you tap an invoice number on the /access lists, on student profiles and on approval cards gets two new buttons next to "Open / Print" and "Download PDF": **Edit** and **Delete**.

### Edit
- Opens the full invoice editor (line items, terms, discounts, GST), already filled in with this invoice.
- Signed-in superadmin: changes save straight away, as they do today.
- Everyone else (staff and password-only /access logins): saving sends an **edit request** with the proposed changes. The invoice stays as it is until approved, and the viewer shows a grey "Edit pending approval" badge.

### Delete
- Shows a confirmation with the invoice number, student, total, amount paid and linked payments, and asks for a reason.
- Signed-in superadmin: deletes straight away using the existing full cleanup (grading, class entitlements, enrolments, auto attendance, payments).
- Everyone else: sends a **delete request**; the button becomes a disabled "Delete pending" marker so it can't be requested twice.
- Paid or verified invoices: delete is offered as cancel with refund to student credit (existing rule), never a silent removal of money received.

### Superadmin approval
- Edit requests appear in the existing **Invoice Action Approvals** card (showing before/after line items and totals); delete requests appear in the existing **Invoice Deletion Approvals** card.
- Approve applies the change exactly as if the superadmin had made it; Reject leaves the invoice untouched and clears the badge.
- Pending counts feed the dashboard approvals total.

## Technical notes
- `InvoiceDetailDialog.tsx`: add Edit/Delete buttons, pending-request badges (loaded via a new SECURITY DEFINER `get_invoice_pending_requests(invoice_id)` RPC).
- Edit reuses `InvoiceDialog` in `mode="edit"`; for non-superadmin the save path calls a new SECURITY DEFINER RPC `submit_access_invoice_edit_request(invoice_id, payload, reason)` that validates the /access session and branch (same check as `create_access_invoice`) and inserts an `invoice_action_requests` row with `action_type='adjustment'`.
- Delete for non-superadmin calls new SECURITY DEFINER `submit_access_invoice_deletion_request(invoice_id, reason)` writing to `invoice_deletion_requests`, rejecting duplicates while one is pending.
- Approval of adjustments: extend `InvoiceActionApprovals` to apply the stored payload through the same invoice-update path the editor uses (keeps entitlement/slot sync and change logs). Deletion approval already calls `deleteInvoice`.
- Tests: one rule test that a non-superadmin save produces a request and not a direct change; one that a second delete request on the same invoice is refused.
