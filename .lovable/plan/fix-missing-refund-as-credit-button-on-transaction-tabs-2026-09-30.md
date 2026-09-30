# Fix missing "Refund as credit" button on transaction tabs

## What is wrong
The orange refund button on the Competitions (and Seminars) rows only appears when the row already has a linked invoice (`matched_invoice_id`). In the screenshot, none of the rows show it — including the "Paid & Verified" row — which means those rows have no invoice linked, so the button stays hidden. Pending-verification rows legitimately have no invoice yet, but a paid & verified row should always have one.

## Changes
1. Verify the data: check whether paid & verified competition/seminar submissions are missing their `matched_invoice_id` link, and whether the auto-invoicing step ran for them.
2. Backfill: link any paid & verified submissions that are missing an invoice (create the invoice where none exists, using the existing auto-invoice path), so every paid & verified row gets its refund button.
3. Make the button's appearance consistent: show the refund button on every row that has an invoice regardless of status, and keep it hidden only when there is genuinely no invoice (unpaid/pending rows). The dialog already enforces the paid/verified-only refund rule.
4. Confirm the same behaviour on School Fees, Grading, Competitions, Seminars, and Uniforms & Guards tabs.

## Technical details
- Button rendering lives in `src/pages/public/PublicGradingList.tsx` (grading, competitions, seminars rows) and `src/components/grading-list/SchoolFeesTab.tsx` / `SeminarsTab.tsx`, gated on `invoice_id` / `matched_invoice_id`.
- Backfill reuses the existing SECURITY DEFINER auto-invoicing RPCs; no schema changes expected.
- No changes to refund rules: only paid/verified invoices can be refunded, non-superadmin refunds still go through superadmin approval.
