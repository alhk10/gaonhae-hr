

## Plan: Make Variant Selection Required in Inventory Adjustments

### Problem
The Inventory Adjustment Dialog currently treats variant (size/color) selection as optional. When adding, removing, or transferring inventory, the exact variant must be specified so stock movements are tracked accurately per variant.

### Changes to `src/components/sales/InventoryAdjustmentDialog.tsx`

1. **Make size variant required** when the product has `requires_size` and `available_sizes`:
   - Change the label from "Size Variant" to "Size Variant *"
   - Remove the "No specific size" option
   - Add validation in `handleSubmit` that blocks submission if no size is selected

2. **Add color variant selector** when the product has `requires_color` and `available_variants.colors`:
   - Add a new dropdown for color selection (same pattern as size)
   - Make it required (label with asterisk, validation on submit)
   - Store in `formData.color_variant` (new field)
   - Pass as part of the `size_variant` string or as a combined identifier (e.g., `"Red / L"`) since the inventory table tracks variants via the `size_variant` column

3. **Combine variant info** for the `size_variant` field sent to `adjustInventory` / `createTransferRequest`:
   - If product has both color and size: combine as `"Color / Size"` (matching existing inventory record patterns)
   - If only size: use size value
   - If only color: use color value

4. **Validation**: Block form submission with a toast error if any required variant field is empty.

### Files to modify
- `src/components/sales/InventoryAdjustmentDialog.tsx` — add color variant dropdown, make variant fields required, add validation

