# External Invoices — show the full product list

## What's wrong
The product picker in the External Invoices "New invoice" form only lists 68 of the 107 products. It hides:
- **23 class products** (Trial Lesson, Private Lesson, Ad-Hoc Lesson, Kang Klass, the weekly packages). Trial students need these.
- **16 products switched off** across the system: Adidas/Gaonhae guards, groin guards, headgear, mouth guard, face shield, Daedo/KPNP electronic foot protectors. Schools and clubs may want to buy these from stock.

The picker is also one long unsorted dropdown with no search, so even products that are listed are hard to find.

## What changes
1. **Every product appears** in the picker, including classes and switched-off items. Switched-off items carry a small "Inactive" tag so staff know.
2. **Grouped and searchable:** the picker becomes a searchable list grouped by category (Classes, Uniforms, Protection Guards & Accessories, Grading, Competition, Seminar, Other). Typing part of a name filters it.
3. **Branch price:** when the branch has its own price for an item, that price is filled in. Otherwise the default price is used. Staff can still change it.
4. **Stock shown:** each physical item shows how many are in stock at the chosen branch. Stock is still taken off only for physical items, not classes or fees.

## Technical details
- Replace `list_external_invoice_products()` with `list_external_invoice_products(p_password, p_branch_id)`. It returns all products with category name, is_active, available_sizes, the branch price override from `guards_branch_products` / `price_rules` when present, and the branch on-hand quantity from `inventory_items`. The /access password is checked on the server.
- In `ExternalInvoicesTab.tsx`, swap the product `Select` for a searchable grouped Command/Popover combobox, and reload it when the branch changes.
- No change to how invoices, GST or stock deduction are calculated.
