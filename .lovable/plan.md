# Audit: /hello payment → invoice → credit refund

I traced the whole path: a parent pays inside /hello, an invoice and payment are created, staff verify it, and later someone refunds it back to credit. Findings below, worst first, each with what I would change.

## First, an important fact

No parent has ever completed a payment in /hello. There are 243 chat sessions and 142 recognised students, but zero "payment submitted" events and zero invoices created by the chat. Everything below is therefore untested in real use, and the payment path should be exercised end to end once before it is promoted to parents.

## Issues found

### 1. Credit put "on hold" is never released or finalised (high)
When credit is used in /hello, the amount is immediately deducted and marked "on hold" against the invoice. Two ready-made steps exist to either apply that hold once staff verify, or return it if the payment is rejected — but nothing in the app or the database ever calls them.
Effect: a rejected /hello payment keeps the parent's credit deducted forever, and a verified one stays labelled "on hold" in Credit Management.
Fix: apply the hold when the payment is verified and return it when it is rejected or the invoice is cancelled, from the same place staff press Verify / Reject.

### 2. Rejecting a /hello payment leaves the invoice marked paid (high)
Rejection recalculates the amount paid and balance but never changes the invoice status, and the /hello invoice is created as "paid" up front. A rejected payment therefore still reads as a paid invoice.
Fix: recalculate the status alongside the balance — unpaid, partially paid, paid, or verified.

### 3. GST on /hello invoices is worked out the opposite way to everywhere else (high)
Every other invoice now adds GST on top ($420 + $37.80 = $457.80). /hello instead treats the amount collected as already including GST, so its subtotal and line items disagree with each other and with the rest of the system, and the amount shown on the payment screen has no GST added.
Fix: use the same add-on-top calculation in /hello, so what the parent is asked to pay, what the invoice says, and what the screenshot shows all agree.

### 4. Refunding a line item leaves the tax behind on the invoice (high)
A refund credits the item plus its tax, but only takes the item (without tax) off the invoice totals. The invoice keeps the tax portion and then shows a balance still owing, even though nothing is owed.
Fix: remove the item and its tax together, and reduce the recorded amount paid so the invoice settles at zero.

### 5. A "Price adjustment" line hides the real prices (medium)
/hello prices lines at the branch's own price and then dumps any difference (discounts, plan pricing, GST) into a single adjustment line. Invoices become hard for staff to read and for accounting to categorise.
Fix: price each line at what the parent was actually charged and keep discounts as discounts.

### 6. Credit-only payments cannot be verified by staff (medium)
When credit covers the whole amount, the only payment record has method "credit" and no screenshot. The verification list shows it with nothing to check, and the automatic screenshot check deliberately skips it.
Fix: treat a credit-only payment as needing a simple confirm/reject, with the credit hold following that decision.

### 7. A failed lesson booking is recorded but not shown to staff (low)
If saving the chosen lesson times fails after payment, the parent is told, and it is written to the chat log, but nothing puts it in front of staff to fix.
Fix: surface these in the approvals area so someone confirms the schedule.

### 8. Refund requests from /access only check the first item (low)
A multi-item refund request is stored with all the items, and approval does handle them all, but the stored summary keeps only the first — history and audit reading can mislead.
Fix: store and display the full item list.

## What is already correct

- Credit is locked per student during payment, so two tabs cannot spend the same credit.
- Screenshot proof is image-only, size-limited, and the automatic amount check is saved against the /hello payment and shown to staff.
- Public refunds from /access always require superadmin approval, and only paid/verified/partially paid invoices can be refunded.
- Refunding an item already cleans up entitlements, enrolments and grading registrations, and cannot be run twice on the same item.

## Suggested order of work

1. Items 1, 2 and 4 — money that is wrongly held, wrongly shown as paid, or wrongly left owing.
2. Item 3 (and then 5) — make /hello pricing identical to the rest of the system.
3. Items 6, 7, 8 as follow-ups.
4. A full test run of a /hello payment (credit-only, part-credit, and full payment) before parents use it.

## Technical notes

- `consume_credit_hold(invoice_id)` / `release_credit_hold(invoice_id)` exist but have no caller in `src/` or in any database function; wire them into `PaymentVerificationApprovals.tsx` verify/reject and `cancelInvoice`.
- `PaymentVerificationApprovals.tsx` reject path updates `amount_paid`/`balance_due` only; add status recomputation matching the standardised set (`draft`/`unpaid`/`partially_paid`/`paid`/`verified`/`cancelled`).
- `submit_public_chat_invoice` computes `v_subtotal := v_paid_total / (1 + rate)` while `invoice_items.total_amount` sums to `v_paid_total`; other paths store `subtotal = sum(items)` with tax on top. Align the RPC and drop the `PUBLIC-HELLO-SG-ADJUSTMENT` line in favour of per-line customer pricing plus `discount_amount`.
- `refundLineItem` in `invoiceRefundService.ts`: credit is `total_amount + tax_amount` but totals subtract `total_amount` from `total_amount` and `subtotal`, and `amount_paid` is untouched, so `balance_due` becomes positive by the tax amount.
- `record_proof_scan_for_invoice` excludes `payment_method = 'credit'` by design; credit-only submissions therefore never get a scan row — needs a non-scan verification affordance.
- `schedule_saved: false` from `submitChatPayment` is logged as `planned_schedule_failed` in `public_chat_events` only; no staff-facing queue reads it.
