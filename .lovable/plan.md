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

## Technical notes

- New `src/components/sales/RefundAsCreditDialog.tsx`: takes an `invoiceId`, loads the invoice plus items (reusing the invoice service), renders selectable lines, and handles both direct refund and approval-request paths via `useInvoiceAccess`/`isSuperadmin`.
- New `refundLineItems(itemIds, reason)` in `src/services/invoiceRefundService.ts`: loops the existing `refundLineItem` logic per item inside one pass so credits, entitlement/enrolment cleanup, grading-registration cleanup and invoice recalculation stay consistent; logs a single combined change entry.
- `submitRefundRequest` extended to accept `item_ids: string[]` (keeping `item_id` for older pending requests). `InvoiceActionApprovals.tsx` updated to display and approve multi-line refund requests, calling `refundLineItems` on approval.
- Row-level buttons read the existing invoice link on each row: `matched_invoice_id` for grading, competition and seminar submissions, `invoice_id` for guards purchases and school-fee rows, `id` for the superadmin invoice list. The button is hidden when a row has no invoice yet, and disabled when the invoice is not paid/verified.
- No database schema change is required; refunds continue through `student_credits`, `entitlements`, `student_class_enrollments` and `invoice_action_requests`.
- Lists refresh after a refund so status and amounts update immediately.
