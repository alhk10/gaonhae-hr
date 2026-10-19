# External invoices: each variant as its own line

## What changes
- In the product picker, products with variants (e.g. Color Belt colours, uniform sizes, "Red / L" combos) show one entry per variant, e.g. "Color Belt — Yellow", "Color Belt — Green", each with its own stock count at the branch.
- Picking an entry fills the item line with that product and variant, so no separate size dropdown is needed.
- Products without variants show once, as today.
- Invoice lines, PDF and stock deduction record the chosen variant.

## Technical details
- `list_external_invoice_products` also returns `available_variants`; per-variant stock comes from `inventory_items.size_variant` at the branch location.
- In `ExternalInvoicesTab.tsx`, expand products into variant keys using the same rule as the inventory tab (colour / size combos, else sizes, else colours, fallback `available_sizes`), and set `size_variant` on selection. Remove the separate size Select.
