# Let staff change Limited Edition design (colour) and size when adjusting an invoice

## Problem
When you adjust INV-202611-0110, the Size and Color columns show "-" and can't be changed. The saved sizes (140 and 160) don't show either.

The adjust screen loads the Limited Edition list for the invoice's branch only while you're creating an invoice. When you open an existing invoice, no branch is set yet, so the list comes back empty. With nothing to choose from, the cells fall back to "-", which also hides the value already saved.

## Fix
- Load the Limited Edition designs and sizes from the invoice's own branch when adjusting an existing invoice.
- In Size and Color, show dropdowns of that product's designs and sizes, starting on the saved choice (for example 160 on 0110).
- If a product has no list, show the saved value instead of "-".
- When you change the design or size, update the line text too, for example "Limited Edition - 2026 … T-shirts (White / 160)". The printed invoice and the linked Uniforms & Guards order then show the new choice when you save.
- Price, quantity, the paid amount and the approval rules for changing paid invoices stay the same. Changing only the design or size doesn't change the total.

## Check
- Open INV-202611-0110 → Adjust. Each shirt shows its size, and you can pick White/Black and a size.
- Save, then confirm the invoice lines and the Uniforms & Guards order show the new design and size.

## Technical details
- `src/components/sales/InvoiceDialog.tsx`: the Limited Edition loader effect uses `formData.branch_id || invoice?.branch_id`. If that's still empty, also fall back to loading all Limited Edition products (staff context) so `leByProduct` is filled in edit mode.
- Edit row cells: when `availableSizes`/`availableColors` are empty, render `item.size_variant` / `item.color_variant` text instead of "-".
- `handleEditItemFieldChange` for Limited Edition lines: rebuild `description` from the design/size, and set `metadata.design` and `metadata.size` on save. The existing items trigger (`_le_items_after` → `_le_sync_invoice`) then updates the linked order.
