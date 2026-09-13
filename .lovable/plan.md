# Refund as credit — one button across all transaction lists

Today a refund is only possible by opening an invoice and clicking a small icon beside a single line. This adds a clear **Refund as credit** button directly on transaction rows, opening one dialog where staff tick the lines to refund.

## What staff will see

A **Refund as credit** button inline on each transaction row that already has an invoice, in:

- Superadmin dashboard — Invoices Created list
- /access — School Fees tab
- /access — Grading tab
- /access — Competitions tab
- /access — Seminars tab
- /access — Uniforms & Guards list

Clicking it opens a **Refund as credit** dialog showing:

- Invoice number, student name and total
- Every line on the invoice with a tick box; already-refunded lines shown struck through and not selectable
- Running total of the credit to be issued as lines are ticked
- A required reason box
- Confirm button: "Refund now" for superadmins, "Submit request" for everyone else

Rules stay exactly as today: only paid/verified invoices can be refunded, non-superadmin refunds go to a superadmin for approval, and a refund issues student credit, deactivates the matching entitlement/enrolment and updates the invoice totals.

The existing per-line refund icon inside the invoice dialog stays, and now opens the same dialog.

## Credits management

Every line refunded appears straight away in Credit Management and on the student's record:

- One credit entry per refunded line, naming the item and its invoice, so the amounts can be traced back.
- Credit Management currently labels both incoming item refunds and cash paid back to a family as "Refund", which reads as money out. Incoming refund credits will be labelled **Item refund** (green) and money paid back stays **Refund** (red), so balances and history are unambiguous.
- The student's credit balance and the Credit Management totals refresh after a refund, and the new credit is available to offset the next invoice as usual.


## Technical notes

- New `src/components/sales/RefundAsCreditDialog.tsx`: takes an `invoiceId`, loads the invoice plus items (reusing the invoice service), renders selectable lines, and handles both direct refund and approval-request paths via `useInvoiceAccess`/`isSuperadmin`.
- New `refundLineItems(itemIds, reason)` in `src/services/invoiceRefundService.ts`: loops the existing `refundLineItem` logic per item inside one pass so credits, entitlement/enrolment cleanup, grading-registration cleanup and invoice recalculation stay consistent; logs a single combined change entry.
- `submitRefundRequest` extended to accept `item_ids: string[]` (keeping `item_id` for older pending requests). `InvoiceActionApprovals.tsx` updated to display and approve multi-line refund requests, calling `refundLineItems` on approval.
- Row-level buttons read the existing invoice link on each row: `matched_invoice_id` for grading, competition and seminar submissions, `invoice_id` for guards purchases and school-fee rows, `id` for the superadmin invoice list. The button is hidden when a row has no invoice yet, and disabled when the invoice is not paid/verified.
- No database schema change is required; refunds continue through `student_credits`, `entitlements`, `student_class_enrollments` and `invoice_action_requests`.
- Credits: `refundLineItems` writes one `student_credits` row per item with `type: 'item_refund'`, `reference_id` = invoice item id and a description carrying product and invoice number. `StudentCredit['type']` gains `'item_refund'`; `CreditManagement.tsx` and `StudentDetails.tsx` badge maps add it (green, "Item refund") while `'refund'` keeps the outgoing red badge. Existing `'refund'` rows created by line refunds are left as-is and still count towards the balance, since totals are a plain sum of `amount`.

- Lists refresh after a refund so status and amounts update immediately.
