# Draft invoices: edit and delete without superadmin approval

## What changes
- When an invoice's status is **draft**, staff (branch passwords and signed-in staff) can **Edit** and **Delete** it straight away. Nothing goes to the superadmin queue.
- The delete box for drafts will say "Delete this draft invoice?" and the button will read **Delete**, not "Send for approval". A reason stays optional.
- Every other status (sent, unpaid, partially paid, paid, verified, etc.) keeps the current approval flow.
- Every direct draft edit or delete is still written to the invoice change log with who did it, so the history is kept.

## Technical details
- New password-checked database steps, with a server-side check that the invoice is still `draft` and in the password's branch scope:
  - `access_delete_draft_invoice(p_password, p_invoice_id, p_reason)`: does the same thorough clean-up as the existing delete (grading registrations, entitlements, lesson bookings, payments, items) and logs to `invoice_change_logs`.
  - `access_apply_draft_invoice_edit(p_password, p_invoice_id, p_request)`: replaces the items and totals using the same payload as `access_submit_invoice_adjustment`, then recalculates and logs it.
  - Both refuse anything that is not a draft.
- `InvoiceDetailDialog.tsx`: add `isDraft`. Drafts skip the approval request. Signed-in users call the existing `deleteInvoice`; password users call the new step.
- `InvoiceDialog.tsx` `saveOrSubmitAdjustment`: drafts run the direct save (signed-in: `handleSave`; password: new step) and skip the approval step.
- Add a small test for the "only drafts bypass approval" rule.
