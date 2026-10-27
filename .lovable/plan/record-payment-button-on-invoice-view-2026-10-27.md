# Record Payment button on invoice view

## What you'll see
- A **Record Payment** button in the invoice popup, next to Edit / Delete / Open-Print / Download PDF.
- Shown only when the invoice still has a balance (not paid in full, cancelled or refunded).
- Opens a payment form pre-filled with this invoice: amount defaults to the balance due, date defaults to today, method defaults to PayNow (Singapore) / bank transfer (Australia), optional reference, notes and proof image (images only, PDFs rejected; optional for cash).
- After saving, the invoice popup refreshes so the status and PDF show the payment (paid / partially paid). Overpayments still follow the existing turn-into-credit prompt.
- Works the same in `/access` (branch passwords stay limited to their own branches) and for signed-in staff.

## Rules kept
- Payments recorded by staff follow the usual verification flow (non-cash shows as pending until verified; invoice totals update immediately as today).
- Branch passwords can only record payments on invoices of their branch(es).

## Technical details
- `InvoiceDetailDialog.tsx`: add button; signed-in users open existing `CreatePaymentDialog` with `preSelectedInvoiceId`; `/access` password sessions use a new compact form.
- New password-gated SECURITY DEFINER RPC `access_record_payment(p_password, p_invoice_id, p_amount, p_date, p_method, p_reference, p_notes, p_proof_url, p_client_ref)` checking `_access_scope`/`_scope_has` against the invoice branch, inserting into `payments` (existing trigger runs `recalc_invoice_from_payments`), idempotent on `client_ref`.
- Proof upload reuses the existing payment-proof storage path with unique filenames.
- Reload invoice detail and PDF after success (bump `reloadKey`).

# Edit opens the full invoice form (with approval)

## What you'll see
- **Edit** in the invoice popup opens the same form used to create invoices, already filled with this invoice's items, terms, slots, discounts and notes. This replaces the "Describe the change needed" text box.
- Each line item gets a **Remark** column so staff can explain the change on each line.
- When a superadmin saves, the changes apply straight away. When branch staff save, a change request is created and the invoice stays the same until it's approved.
- In the approval, the superadmin sees the invoice with each line's changes highlighted: added lines in green, removed lines struck through in red, and changed lines shown as old -> new. Each line's remark and the old vs new total are shown too. Approving applies the changes; rejecting keeps the original invoice.
- Remarks are kept in the change history. They are not printed on the PDF.

## Technical details
- `InvoiceDetailDialog.tsx`: Edit always opens `InvoiceDialog` in edit mode with the existing invoice. When a non-superadmin submits, the proposed items and per-item remarks go to an approval request instead of being saved.
- The request stores a `proposed_payload` jsonb (items with remarks) plus a snapshot of the original invoice. The superadmin approval view shows the differences and applies them through the existing invoice update service, so the rules for entitlements, slots and refunds stay the same.
