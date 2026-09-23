# Same status everywhere, and fix the refund dialog on /access

## 1. Status on the tabs should follow the invoice

Today the Grading, Competitions, Seminars and Uniforms & Guards tabs show the status of the *payment submission* ("Paid"), while the student card shows the invoice status ("Paid & Verified") for the same record. School Fees already shows the invoice status.

Change: whenever a row has an invoice, the tab shows that invoice's status. Rows with no invoice yet keep showing the submission status (Pending verification / Rejected / Cancelled / No invoice).

Result: the grading row for EDWIN VAUTRIN reads "Paid & Verified", matching invoice INV-202609-0056, and the same wording and colours apply on every tab.

## 2. "Invoice not found" in Refund as Credit

The /access tabs are public pages, so the refund dialog cannot read the invoice at all — it always shows "Invoice not found", and even with the invoice loaded the refund request could not be submitted from a public page.

Change: the dialog loads the invoice through the same kind of public read used elsewhere on /access, and submitting a refund request from these tabs goes through a dedicated, password-gated path. Behaviour stays as it is today: staff submit a request, a superadmin approves it, and the credit is issued on approval. On the signed-in dashboards nothing changes.

## Technical notes

- Extend `get_public_grading_list`, `get_public_competition_list`, `get_public_seminar_list` and `get_public_guards_purchase_list` to return `invoice_status` (from the linked invoice), mirroring `get_public_school_fees_list`.
- In `PublicGradingList.tsx` (both lists), `SeminarsTab.tsx`, `SchoolFeesTab.tsx`, `PublicGuardsPurchaseList.tsx` and the Competitions tab, feed `StatusBadge` with `invoice_status ?? submission status`; keep `normalizeStatus` as the single mapping (no new labels or colours).
- Add `get_public_invoice_detail(uuid)` (SECURITY DEFINER, returns invoice header + items + payments, granted to anon) and `submit_public_refund_request(invoice_id uuid, item_ids uuid[], reason text, requested_by text)` (SECURITY DEFINER, inserts into `invoice_action_requests` with `status='pending'`), since `invoices`, `invoice_items` and `invoice_action_requests` have no anon policies.
- `RefundAsCreditDialog` gains a `publicMode` flag: when set, it loads via the public RPC and submits via the public RPC instead of `getInvoiceById` / `submitRefundRequest`; superadmin instant refunds remain signed-in only.
- No change to stored status values, refund maths, or approval flow.
