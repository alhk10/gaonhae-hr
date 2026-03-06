

## Plan: Hide Quantity and Unit Price Columns from Invoice PDF

### Problem
The invoice PDF currently shows four columns: Description, Qty, Unit Price, and Total. The user wants to hide the Qty and Unit Price columns, showing only Description and Total.

### Changes

**File: `src/utils/invoicePDFGenerator.ts`** (lines 239-274)

1. **Remove column width definitions** for `qty` and `price`, expand `description` to fill the space
2. **Remove header text** for "Qty" and "Unit Price" (lines 253-254)
3. **Remove row data** for quantity and unit_price (lines 272-273)
4. Keep only "Description" (left-aligned) and "Total" (right-aligned)

