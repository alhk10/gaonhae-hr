# Inline paid invoice in School Fees tab (/access)

## Current state (verified)
- `/fees` and `/hello` both write into `public_chat_payment_submissions`; the School Fees tab lists them via the `get_public_school_fees_list` RPC, which already returns `invoice_id`, `invoice_number`, `invoice_status`, `payment_id`, `payment_number` and `payment_verification_status`.
- `admin_match_school_fees_submission` creates a paid invoice + payment row on match; verify/reject RPCs already exist and are wired into the tab.
- The tab currently renders the invoice number as plain text; there is no invoice view.
- `src/utils/invoicePDFGenerator.ts` exists (`generateInvoicePDF`, `getInvoicePDFBlob`), but `/access` runs unauthenticated (password gate only), so invoice data must come from a SECURITY DEFINER RPC — normal invoice queries are blocked by RLS.

## What will be built

### 1. Database
New SECURITY DEFINER RPC `get_public_school_fees_invoice(p_submission_id uuid)` returning everything the PDF needs for a matched submission:
- invoice header (number, dates, subtotal, tax, discount, total, amount paid, balance, status, notes)
- invoice items (description, qty, unit price, total)
- student name/email/phone and branch name/address
- payment summary (number, method, date, amount, reference)
Granted to `anon` and `authenticated`; returns nothing when the submission has no matched invoice.

### 2. Service layer
`getSchoolFeesInvoiceDetail(submissionId)` in `src/services/schoolFeesSubmissionService.ts`, mapping the RPC result into the existing `InvoiceData` shape used by the PDF generator.

### 3. UI in `SchoolFeesTab.tsx`
- **Invoice column**: when `invoice_id` exists, the invoice number becomes a button opening a preview dialog that renders the generated invoice PDF inline in an iframe, with Download and Print buttons. Unmatched rows keep the "—".
- The invoice reflects its paid state (paid/verified status and amount paid come straight from the invoice record) — no separate receipt document.
- Dialog is mobile-friendly (`max-w-[95vw]`, tall iframe, text-xs controls) and matches the existing preview-dialog styling in the tab.
- **Matching and verification stay user-driven** from this tab: the existing "Link to student" (match) action and the Verify / Reject actions remain available to users with edit permission, including for rows already matched but not yet verified.
- After a match or verify action the list refetches so the invoice button and updated status appear without a page reload.

## Notes
- No change to how submissions arrive — both `/fees` and `/hello` already land in the same tab.
- Dates in the PDF use the DD/MM/YYYY helpers already used by the invoice generator.
