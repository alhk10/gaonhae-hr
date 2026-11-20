# Custom (non-product) lines on external customer invoices

## What changes
In **New external customer invoice**, each item line gets a choice: **Product** (as today) or **Custom item**.
- Custom item: type a description (e.g. "Demo performance fee", "Transport", "Venue hire"), quantity and price.
- Mix custom and product lines on one invoice.
- GST works the same as product lines (respects the "Prices include GST" switch).
- Custom lines don't touch stock and show on the invoice PDF with their description.
- Create invoice is allowed when every line is either a chosen product or a custom line with a description and price above $0.

## Technical details
- `ExternalInvoicesTab.tsx`: `Line` gains `kind: 'product'|'custom'` and `description`; a small toggle per line switches between the product picker and a description input; validation updated; payload sends `description` with `product_id` null for custom lines.
- Migration: update `create_external_invoice` so items without `product_id` require a non-empty description (max 200 chars), insert `invoice_items` with `product_id` NULL and that description; product lines unchanged. GST rounding uses `_tax_floor` (round up to the cent) per project rule.
- Confirm `invoice_items.product_id` is nullable and that `_external_stock_move` and PDF rendering skip/handle null products.
