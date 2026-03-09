

## Problem
The View/Edit Invoice dialog's edit mode is missing two features that exist in the Create Invoice dialog:
1. **Size variant editing** — no way to view or change the `size_variant` field on line items
2. **Line discount editing** — no discount controls; the `LineDiscountPopover` component and discount logic are absent

## Root Cause
The `EditableItem` interface and edit UI in `ViewEditInvoiceDialog.tsx` were built with only Product, Qty, Unit Price, and Total fields. The `size_variant` column (which exists on `invoice_items`) and discount data (stored in `metadata.line_discount`) are loaded but never rendered or editable.

## Plan

### 1. Add discount and variant fields to EditableItem interface
- Add `discount_type?: 'percentage' | 'amount'` and `discount_value?: number` to `EditableItem`
- Initialize these from `metadata.line_discount` when entering edit mode

### 2. Copy LineDiscountPopover from CreateInvoiceDialog
- Extract or duplicate the `LineDiscountPopover` component into ViewEditInvoiceDialog (it's a small inline component)

### 3. Add size variant selector to edit UI
- After the Product/Qty/Price row, add a conditional row showing a size variant `Select` (from product's `available_variants.sizes` or `available_sizes`) or a text `Input` for freeform sizes
- Pre-populate with the item's current `size_variant`

### 4. Add LineDiscountPopover to each edit item row
- Place it next to the Total column, matching the CreateInvoiceDialog layout

### 5. Update recalcItem to factor in discounts
- Modify `recalcItem` to apply discount before tax: `gross = qty * price`, then subtract discount, then apply tax

### 6. Update handleItemFieldChange
- Support `'size_variant'` as a field
- Add a new `handleItemDiscountChange` function

### 7. Update save logic
- Include `size_variant` in the update/insert calls (already a column on `invoice_items`)
- Store discount in `metadata.line_discount`
- Use discounted total for `total_amount`

### Files to modify
- `src/components/sales/ViewEditInvoiceDialog.tsx` — all changes in this single file

