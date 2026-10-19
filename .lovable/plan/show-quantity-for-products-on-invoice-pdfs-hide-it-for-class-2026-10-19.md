# Show quantity for products on invoice PDFs, hide it for classes

Invoices currently hide quantity on every line. Add a "Qty" column to the items table on the invoice PDF:
- Products (belts, uniforms, guards, accessories, etc.) show their quantity, e.g. "2".
- Class and lesson lines (term fees, ad-hoc lessons) and grading lines show nothing in that column.
- Totals and descriptions stay as they are.

## Technical details
- `src/utils/invoicePDFGenerator.ts` items table: add a "Qty" header to the left of Total, roughly 30mm from the right edge. Print `item.quantity` unless the line counts as a class.
- A line counts as a class if it has `metadata.term_id`, `metadata.grading_slot_id`, `term_info` or `grading_info`, or a description that matches lesson/class/term. Put this check in a small helper and add a unit test for it.
- Update the invoice PDF layout memory so it says Qty is shown for products only.
