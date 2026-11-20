# Unit price, discount and tax columns on external customer invoice PDFs

## What changes
External customer invoices (schools/clubs, retail, trial customers) get these columns on the printed/PDF invoice:

```text
Products/Services                 Qty  Unit Price  Discount     Tax       Total
30 Mins Lesson (External)          12    S$134.00  -S$80.40  S$137.48  S$1,665.08
9 to 12 pax - for age 3-4
ADIDAS Basic White Training         2    S$130.00         -   S$23.40    S$283.40
Uniform
```

- Discount column shows only the amount taken off (e.g. -S$80.40); lines without a discount show "-". The "(less 5%)" text is removed from the description.
- Tax column shows the GST on each line.
- Long product names wrap onto extra lines so they never overlap the number columns.
- Totals block (Subtotal > Discount > GST > Total) stays the same.
- Student invoices keep today's layout.

## Technical details
- `src/utils/invoicePDFGenerator.ts`: when `invoice.customer_type === 'external'`, draw a 6-column header and rows with narrower fixed numeric columns. Per line: unit = `unit_price`; tax = `tax_amount`; net before GST = `total_amount - tax_amount` when GST is added on top, or `total_amount` when prices include GST; discount = qty x unit - net (inclusive: qty x unit - total). Strip a trailing "(less ...)" from the description; wrap it with `splitTextToSize` and advance the row height by the number of wrapped lines.
- Verify by regenerating the Carpe Diem invoice (INV-202611-0073) and reading the PDF text plus a rendered page image.
