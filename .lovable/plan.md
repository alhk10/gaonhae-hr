# Show existing invoice lines when editing

## Problem
In `/access`, Edit opens with "Items (0)" and $0.00 totals, although the invoice has items. The edit form only fills in its lines after the product list loads, and in `/access` (password login, not signed in) that product list comes back empty, so the lines never appear.

## Fix
- Fill the edit form with the invoice's current lines (product, qty, price, discount, size, colour, term/slot, remark) as soon as the invoice loads, without waiting for the product list.
- In `/access`, load the product list from the same password-checked catalogue the create-invoice form already uses, so product names, categories and dropdowns work.
- Fill the lines once per open, so a late product load doesn't wipe staff changes; extra product details (category, lesson flag) are added when the product list arrives.
- Totals, GST, paid and balance at the top then match the real invoice.

## Technical details
- `InvoiceDialog.tsx` `loadViewProducts`: when `accessMode`, use `getCatalog().products` instead of `getProducts`.
- Edit-init effect: drop the `viewProducts.length > 0` gate; init when the invoice id changes (ref guard); a second effect enriches `category_name`/`is_lesson` from `viewProducts` without overwriting edited values.
- Verify by opening INV-202610-0185 in `/access` Edit and checking the line and $158.05 total appear.
