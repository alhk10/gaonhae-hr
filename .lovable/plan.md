## Goal

Add a **School Fees** tab to `/grading-list`, placed right after Summary, listing school-fee payments submitted through the `/hello` public chat. Staff unlocked with the admin password can verify, reject or delete a submission.

## How /hello payments work today (verified)

When a visitor pays in `/hello`, the `submit_public_chat_invoice` database function:
- creates an invoice (status `paid`, created_by `public_hello_chat`),
- creates a payment record with verification status `pending_verification` and the uploaded proof,
- writes a row into `public_chat_payment_submissions` (category, items, amount, method, proof, matched student, status `pending_verification`).

That submissions table is currently empty (no live /hello payments yet) and nothing in the app reads it — so this tab is the first consumer. School Fees is category id `a416f120-4ec2-4826-8d37-375db3e002bc`.

## What gets built

**1. New read function `get_public_school_fees_list`**
Returns school-fee chat submissions joined with student, branch and the linked invoice/payment: student name, branch, term/items summary, amount, payment method, proof URL, reference/invoice number, payment status, submitted date. Filterable by branch and status. Runs with elevated rights so the public page (like the other tabs) can read it.

**2. New action functions (all mirroring the existing competition/grading equivalents)**
- `admin_verify_school_fees_submission` — marks the submission verified and flips the linked payment to verified.
- `admin_reject_school_fees_submission` — marks the submission rejected, marks the payment rejected, and reverses the invoice to unpaid so it isn't counted as collected.
- `admin_delete_school_fees_submission` (plus a delete-context function) — shows what will be removed, then deletes the submission, its payment and the auto-created invoice and invoice items.

**3. New service file `src/services/schoolFeesSubmissionService.ts`**
Typed wrappers for the four functions above, following the shape of `competitionPaymentSubmissionService`.

**4. New component `src/components/grading-list/SchoolFeesTab.tsx`**
- Filters: branch, status (all / pending / verified / rejected), text search on student name.
- Table: Date, Student, Branch, Items (term/product summary), Amount, Method, Proof (thumbnail opening the existing enlarged preview dialog), Status badge, Actions.
- Actions column visible only when the page is unlocked with the admin password: Verify, Reject, Delete (delete uses the shared `DeleteRowConfirmDialog` with the context summary).
- Mobile: condensed stacked rows consistent with the other tabs; dates via `@/utils/dateFormat`, money via `formatCurrency`.

**5. `src/pages/public/PublicGradingList.tsx`**
- Tabs grid goes from 5 to 6 columns; add `School Fees` trigger immediately after `Summary`, with its `TabsContent` rendering `SchoolFeesTab` and receiving the existing unlocked/admin flag.

**6. `src/components/grading-list/SummaryTab.tsx`**
- Add a "School Fees" column to the pending-approvals-by-branch table so the summary keeps covering every tab.

## Notes

- No existing behaviour on `/hello` changes; this is a read/approve surface over data it already writes.
- Because the submissions table is empty today, the tab will show an empty state until the first `/hello` school-fee payment comes in; I'll verify the query end to end against a test row.
