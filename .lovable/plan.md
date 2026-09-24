# Finish the /hello payment audit fixes

## Already done (verified in code)

1. Credit holds are now finalised on verify (`consume_credit_hold`) and returned on reject (`release_credit_hold`) in PaymentVerificationApprovals, and released on invoice cancellation in invoiceService.
2. Rejecting a payment now recomputes the invoice status, not just the balance.
3. /hello invoices now use add-on-top GST matching the rest of the system.
4. Item refunds now return the item plus its tax and correct the invoice's paid amount.
5. /hello prices lines at what the parent was charged instead of a hidden adjustment line.

## Remaining work

### 1. Credit-only payments can be confirmed by staff (medium)
When credit covers the whole amount, the only payment record has method "credit" and no screenshot, so staff have nothing to act on.
- Show credit-only payments in the verification list with a simple Confirm / Reject action (no proof image).
- Confirm finalises the credit hold; Reject returns the credit and recomputes the invoice.

### 2. Surface failed lesson bookings to staff (low)
If saving chosen lesson times fails after payment, it is only written to the chat log (`planned_schedule_failed` event) and never shown to staff.
- Add a staff-facing list (approvals area) of failed schedule saves so someone confirms the schedule manually.

### 3. Show the full item list on multi-item refund requests (low)
Multi-item refund requests store all items and approval handles them all, but the summary/history shows only the first item.
- Display the complete item list in the refund request summary and history.

### 4. End-to-end test run
Exercise a real /hello payment in three modes before promoting to parents: credit-only, part-credit, and full payment — confirming invoice totals, GST, credit hold behaviour, and verification each time.

## Technical notes

- `PaymentVerificationApprovals.tsx`: include `payment_method = 'credit'` rows with a confirm/reject affordance; reuse the existing `consume_credit_hold` / `release_credit_hold` calls.
- `record_proof_scan_for_invoice` intentionally skips credit payments — no scan row needed, just the confirm/reject action.
- Failed schedules: read `public_chat_events` where `step = 'planned_schedule_failed'` and render in the superadmin/branch approvals area.
- Refund summary: `invoice_action_requests.details.item_ids` already holds the full list; update the display in `InvoiceActionApprovals.tsx`.
