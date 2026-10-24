# Show staff-created invoices paid through /hello in School Fees

## What's wrong
The School Fees list in `/access` only shows invoices that /hello created itself. Royce (INV-202610-0143) and Rayner (INV-202610-0144) had their invoices created by staff in `/access`, then paid through /hello's outstanding-invoice popup, so they were left out. (Rayner's INV-202609-0410 was created automatically and has the same problem.)

## Change
School Fees will list any student invoice that has at least one payment submitted through /hello, whoever created the invoice: staff, automatic invoicing or /hello.
- Each invoice shows once, with its latest /hello payment, proof, scan amount and status.
- Each row gets the "Hello" tag, so the existing verify, reject, refund and proof actions work on it.
- Royce's and Rayner's invoices will show up with no change to their data.
- Grading, competition and guards invoices that already show in their own tabs stay out of School Fees. Only invoices with class or school-fee items are included, as today.

## Technical details
- New migration to update `get_public_school_fees_list`: change the second UNION branch's filter from `i.created_by = 'public_hello_chat'` to `(i.created_by = 'public_hello_chat' OR EXISTS (payments p WHERE p.invoice_id = i.id AND p.created_by = 'public_hello_chat'))`. Exclude cancelled-draft noise and any invoice already covered by a submission row, so nothing appears twice.
- Prefer the latest non-credit payment where `created_by = 'public_hello_chat'` for the payment/proof columns.
- Keep the existing category scope for school fees so grading-only or guards-only invoices don't appear.
- Check: search "rayner" and "royce" through the function and confirm the 3 invoices come back once each.
