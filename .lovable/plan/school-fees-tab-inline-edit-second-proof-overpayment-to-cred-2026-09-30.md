# School Fees tab: inline edit, second proof, overpayment-to-credit request

## 1. Inline Edit button (every row, staff with edit rights)
- Pencil icon in the Actions column for both /hello payments and older fee-form submissions.
- Opens a compact dialog to edit: student name, branch, class/items, term, amount, payment method, contact email/phone, remark.
- Not yet verified: saves immediately.
- Already Paid & Verified: saved as a correction request for superadmin approval (same flow as existing "Submission Correction Requests"), so invoices stay consistent.
- Branch passwords only see/edit their own branch.

## 2. Second payment screenshot when amounts don't match
- If the proof scan reads an amount different from the amount due (or no amount could be read), the row shows an amber "Amount mismatch" badge and an "Add 2nd proof" button (in the row and in the proof popup).
- The second screenshot is stored alongside the first (the first is kept, not replaced). The proof popup shows both, with each scanned amount and the combined total.
- If the combined total now matches, the mismatch badge clears; verification status is not changed automatically.
- Images only (PDFs rejected), same as other proof uploads.
- Parents on /hello see the same "upload another screenshot" option on their payment when the scan reports a shortfall.

## 3. Request overpayment as credit
- When the scanned/combined paid amount is higher than the invoice total, row shows "Overpaid $X" and a "Request credit" button.
- Staff confirm the amount and reason; this creates a request in the superadmin dashboard approvals (new type "Overpayment to credit").
- Superadmin approves: $X is added to the student's credits (type overpayment, linked to the payment/invoice) and is auto-used on their next invoice. Reject: nothing added.
- Blocked if the row isn't matched to a student, or a request for that payment is already pending/approved (no double credit).

## Technical notes
- DB: add `additional_proof_urls jsonb` (+ per-proof scanned amounts) to `public_chat_payment_submissions` and the invoice-backed /hello payment source; allow `overpayment_credit` in `invoice_action_requests.action_type`.
- New SECURITY DEFINER RPCs: `admin_update_school_fees_submission`, `admin_add_school_fees_extra_proof`, `request_overpayment_credit`, `approve/reject_overpayment_credit` (approval inserts into `student_credits`, idempotent per payment).
- `get_public_school_fees_list` returns extra proofs, scanned total and overpaid amount.
- UI: `SchoolFeesTab.tsx` (edit dialog, badges, buttons, popup), superadmin approvals card for the new request type, /hello payment step for the second upload.
