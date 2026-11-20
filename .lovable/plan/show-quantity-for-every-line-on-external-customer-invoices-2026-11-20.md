# Show quantity for every line on external customer invoices

## Cause
The invoice PDF hides Qty for class/lesson lines (student term fees show weeks in the description instead). The two "Lesson (External)" lines look like class lines because of the word "Lesson", so their quantity is hidden.

## Change
- On external customer invoices (schools/clubs, retail, trial customers), always print the quantity on every line, including lesson lines.
- Student invoices keep the current rule (no Qty on class lines).

## Technical details
- `src/utils/invoicePDFGenerator.ts`: print `item.quantity` when `invoice.customer_type === 'external'` or the line is not a class line. Apply the same rule in the text/WhatsApp summary if it also hides quantity.
- Verify by regenerating the Carpe Diem invoice PDF and checking Qty shows 12 / the lesson quantities.
