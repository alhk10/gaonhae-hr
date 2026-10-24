# School Fees tab: show every paid class fee

## Goal
The `/access` School Fees tab should list every class-fee invoice that has a payment, whether it came from `/hello`, was auto-created, or was created manually by staff (e.g. Rayner and Royce Wee).

## Current behaviour
The list only includes `/hello` submissions, and invoices created by `/hello` or paid through `/hello`. Staff-made invoices paid by other means are skipped.

## Changes
1. Update the School Fees list so the second part includes any invoice that:
   - contains at least one "Classes" category item, and
   - has at least one non-credit payment (or is paid/verified/partially paid),
   - is not a duplicate of a row already shown from a `/hello` submission.
2. Tag each row with its source: **Hello**, **Auto**, or **Manual (staff)**, shown as a small badge.
3. Keep existing branch filtering, status filter, search, verify/reject, edit and delete actions working for the new rows.
4. Confirm Rayner and Royce Wee appear when searched.

## Technical details
- Rewrite `get_public_school_fees_list` (migration): replace the `created_by='public_hello_chat' OR EXISTS hello payment` condition with an EXISTS on `invoice_items` joined to `products`/`product_categories` where category = Classes, plus an EXISTS on non-credit payments; exclude invoices already resolved via `_resolve_chat_submission_invoice` from submissions.
- Source value: `hello` if created/paid via `public_hello_chat`, `auto` if created by trigger/system, otherwise `manual`.
- `SchoolFeesTab.tsx`: render the source badge and update empty-state text.
- Verify with a read query for Rayner/Royce and row counts per branch.
