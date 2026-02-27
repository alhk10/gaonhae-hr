

## Plan: Product Variants, Line Discounts, and Searchable Product Select

### Problem
1. Products with size variants (e.g., uniforms) need a mandatory size selection before adding to invoice
2. No line-level discount capability exists
3. Product selection uses a basic dropdown — needs searchable/fuzzy matching like the student selector

### Changes

#### 1. Searchable Product Select (in `CreateInvoiceDialog.tsx`)
- Create a `ProductSearchSelect` component using the same Popover+Command pattern as `StudentSearchSelect`
- Apply the existing `fuzzyMatch` function for searching
- Replace the plain `<Select>` for product in the inline add row with this searchable component

#### 2. Size Variant Selection Enhancement (in `CreateInvoiceDialog.tsx`)
- Update `sizeOptions` derivation to also check `requires_size` + `available_sizes` fields (legacy path) in addition to `available_variants.sizes`
- Validate in `addItem()` that if a product has size options, a size must be selected before adding
- Show size selector for existing items too (currently just shows text)

#### 3. Line Discount Column (in `CreateInvoiceDialog.tsx`)
- Add `discount_type` ("percentage" | "amount") and `discount_value` (number) fields to the `InvoiceItem` interface
- Add a "Discount" column to the items table between Price and Size
- Clicking the discount cell opens a small Popover with:
  - Toggle between "%" and "$" discount type
  - Input field for the discount value
- Update `total` calculation: `total = (qty * price) - discountAmount` where discountAmount is either a flat amount or `(qty * price) * (percentage / 100)`
- Store discount info in the item's metadata when creating the invoice (since `invoice_items` table has no discount column)
- Update `calculateTotals()` to use the discount-adjusted line totals

#### 4. Update Invoice Service (in `src/services/invoiceService.ts`)
- Pass discount data in the metadata field of each invoice item
- Apply line discount to `total_amount` when saving

### Files to Modify
- `src/components/sales/CreateInvoiceDialog.tsx` — All three features
- `src/services/invoiceService.ts` — Handle discount in item total calculation

