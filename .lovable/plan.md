# Unit price and discount columns on external customer invoice PDFs

## What changes
External customer invoices (schools/clubs, retail, trial customers) get the following columns on the printed/PDF invoice:

```text
Products/Services                         Qty   Unit Price   Discount   Total
30 Mins Lesson (External) 9 to 12 pax       12     S$134.00   5% (-S$80.40)   S$1,665.08
ADIDAS Basic White Training Uniform          2     S$130.00          -        S$283.40
```

- The "(less 5%)" text moves out of the description into the Discount column, shown as the % or $ entered plus the amount taken off.
- Lines without a discount show "-".
- Long descriptions wrap onto a second line instead of running into the numbers.
- Totals block (Subtotal > Discount > GST > Total) stays the same.
- Student invoices keep today's layout (no Unit Price column).

## Technical details
- `src/utils/invoicePDFGenerator.ts`: when `invoice.customer_type === 'external'`, draw the 5-column header and rows. Per line: unit = `unit_price`; net before GST = `total_amount - tax_amount` when GST is added on top, or `total_amount` when prices include GST; discount amount = qty x unit - net. The label (e.g. "5%" or "$20.00") is read from the trailing "(less ...)" in the description, which is then removed from the printed description. Descriptions wrap with `splitTextToSize`.
- Verify by regenerating the Carpe Diem invoice (INV-202611-0073) and reading the PDF text.
