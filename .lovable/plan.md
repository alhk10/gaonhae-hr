# Fix "School fees submission … not found" when verifying

## Cause
School fees rows now include class-fee invoices created by staff or through the /hello invoice flow, not only /hello submissions. For those rows the Verify and Reject buttons send the invoice's ID, but the verify/reject functions only look for a /hello submission with that ID. So they fail with "not found". Example: the ID in the error belongs to an invoice, not a submission. The same failure happens in the School Fees tab.

## Fix
- **Verify:** when the ID is an invoice, verify that invoice's pending payments, set the invoice to verified, apply any held credit, and clear the "awaiting verification" flag on scheduled classes. This is the same result as a submission verify.
- **Reject:** when the ID is an invoice, reject its pending payments with the reason, then recalculate the invoice so it shows the balance due again.
- Submission rows keep working as today.

## Check
- After the change, verify one of the Morley rows (for example Emily Hana Horsfall, INV-2026-00473) by calling the function.
- Confirm the payment and invoice show as verified and the row leaves For Action.

## Technical details
- Update `admin_verify_school_fees_submission` and `admin_reject_school_fees_submission`: if there's no `public_chat_payment_submissions` row, fall back to `invoices.id = p_id`. Otherwise raise the existing error.
- No frontend change is needed: Summary and School Fees both pass `row.id`.
