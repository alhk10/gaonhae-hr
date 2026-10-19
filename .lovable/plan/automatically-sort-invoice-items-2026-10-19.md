# Automatically sort invoice items

## Order
1. Trial
2. Registration
3. Classes (lessons, term/school fees)
4. Grading
5. Competition
6. Uniforms: White, then Poom, then Dan/Black (Custom Black Uniform counts as Dan/Black)
7. Belts, by grade order (Foundation 1 → White → Yellow Tip → Yellow → … → Red → Black Tip)
8. Protection guards & accessories
9. Anything else last

Within the same group and grade, items sort by size from smallest to largest (e.g. Poom 120, 130, 140, 150), then by name.

## Where it applies
- Invoice PDFs (every invoice, including the one shown)
- Invoice detail view and the item list on the new/edit invoice forms, including External Invoices
- Saved data is not changed. Only the display order is.

## Technical details
- New shared helper `src/utils/invoiceLineSort.ts`: `getInvoiceLineSortKey(description, category?)` returns group rank, sub-rank (uniform type, or belt index from `COMMON_BELTS`/foundation lists using the variant text inside the brackets) and numeric size. Sorting is stable.
- Use it in `invoicePDFGenerator.ts`, `InvoiceDetailDialog.tsx`, and the item lists in `InvoiceDialog.tsx` / `ExternalInvoicesTab.tsx`.
- Add `invoiceLineSort.test.ts` covering group order, Poom before Black uniform, belt grade order and size order.
