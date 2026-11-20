# Discount ($ / %) and line total on external customer invoices

## What changes
In **New external customer invoice**, each item line gets:
- A **Discount** button (same as the student invoice): pick **%** or **$**, enter a value. Shows e.g. "10%" or "$20.00" once set.
- A **Line total** column at the end of the row: quantity x price minus discount (e.g. 12 x $134 - 10% = $1,447.20).
- Small column headings above the rows: Item · Qty · Price · Disc · Line total.

The invoice total shows **Subtotal > Discount > GST > Total**, with GST on the amount after discount (per the existing rule). The printed invoice shows the discounted line totals and the invoice discount.

Discounts can't exceed the line amount. On phones, the line wraps to two rows.

## Technical details
- `ExternalInvoicesTab.tsx`: `Line` gains `discount_type` ('percentage'|'amount') and `discount_value`; reuse the discount popover pattern from `InvoiceDialog.tsx` (extract `LineDiscountPopover` into a shared component if needed); show the line total; send the discount fields in the payload.
- `externalInvoiceTotal.ts`: apply line discounts before GST and return subtotal/discount; add tests (10% of 12 x 134 = 160.80 off; $ discount capped at line gross).
- Migration: `create_external_invoice` computes each line net = gross - discount (capped, never negative), puts tax on the net, sets the line `total_amount` and unit-price/description, and sets `invoices.discount_amount` to the sum of line discounts. GST rounds up to the cent via `_tax_floor`.
