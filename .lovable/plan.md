# Invoice studio rentals as external customers

## What changes
- When staff verify a studio rental in /access, an invoice is created automatically for the renter as an external customer. Renters are not added as students.
- The invoice shows the renter's name, NRIC/UEN, email and contact number, one line per session (date, time, hours, rate), the $200 deposit on its own line when it applies, and GST following the branch country rule.
- The invoice uses the branch's saved country invoice template, is marked Paid & Verified, and records the payment method and proof from the rental form.
- In the Studio Rental tab, each verified rental shows its invoice number. Clicking it opens the invoice details with a PDF download.
- Rejecting or deleting a rental cancels its invoice.
- Branch staff and student dashboards only list student invoices. Rental invoices stay out of student lists, the student portal and /hello.
- I'll check existing verified rentals and create invoices for any that don't have one.

## Technical details
- Allow an invoice without a student (`student_id` becomes nullable) and add `customer_type` ('student' | 'external'), `customer_name`, `customer_email`, `customer_phone`, `customer_reference` (NRIC/UEN). A validation trigger requires either a student_id or, for external invoices, a customer_name.
- Add `studio_rental_submissions.invoice_id` and `payment_id`.
- `admin_review_studio_rental` (SECURITY DEFINER) creates the invoice, its items and a verified payment in one step. It won't create a second invoice if one already exists. Items use a "Studio Rental" / "Rental Deposit" product, created if missing. Invoice numbers come from `_next_invoice_number`.
- Student-scoped invoice queries (portal, /hello, student dialogs, credits, sibling and auto-invoice logic) filter on `customer_type = 'student'`. Invoice PDFs and detail screens fall back to the customer fields when there is no student.
- Finance and P&L reporting by branch include rental invoices as income.
