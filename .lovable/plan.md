# External Invoices — finish the remaining gaps

The External Invoices tab in /access already lets staff create invoices for trial students, schools/clubs and retail buyers and record payments. This plan closes the gaps left open.

## 1. Deduct branch stock
- When an external invoice is created, reduce stock at the invoice's branch for each item (and size), the same way normal inventory sales do.
- When an external invoice is cancelled, put the stock back.
- If stock would go negative, still allow the sale but show the existing negative-stock warning.

## 2. Proof of payment
- Record payment dialog gets an image upload (images only, PDFs rejected), required for PayNow / bank transfer, optional for cash.
- The proof appears as a thumbnail icon in the list and in invoice details.
- Non-cash payments go to "pending verification" and appear in the existing superadmin payment verification queue; cash is confirmed immediately.

## 3. Cancel / edit
- Cancel button on unpaid invoices (password-locked branch staff send a request to superadmin; superadmin cancels directly).
- Paid invoices: cancellation refunds go through the existing approval flow (external customers have no student credit, so the refund is recorded as a refund, not credit).

## 4. Sales module visibility
- In Invoices & Payments, add an "External" filter so finance sees these invoices with the customer name instead of "Unknown Student".
- Email/WhatsApp share use the customer's own email/phone.

## 5. Tighter security
- Each External Invoices action re-checks the /access staff password and its branch on the server, so a branch-locked password cannot create, pay or view another branch's invoices.

## Technical details
- New/updated database functions: create_external_invoice (adds inventory movements), cancel_external_invoice, record_external_invoice_payment (proof URL, pending status for non-cash), list_external_invoices (branch-scoped by validated session).
- Proof uploads use the existing payment-proof storage bucket with unique file names.
- invoiceService / InvoiceManagementList fall back to customer_name / customer_email for external invoices.
- Add a small test for external GST totals (SG 9% added, AU inclusive) and the stock deduction rule.
