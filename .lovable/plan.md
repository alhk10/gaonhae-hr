

## Plan: Redesign InventoryListTab — Compact Table with Branch Columns

### Current Issues
- Each product+branch combo is a separate row (duplicating product names)
- Shows SKU, branch name, variant count as subtitle text
- Branch filter dropdown is redundant since branches will become columns
- No selling price shown; cost price only on some rows

### New Design

**One row per product.** Each branch gets its own column showing the total stock quantity for that product at that branch. Variants (size/color) are cascaded sub-rows revealed on click. Remove SKU subtitle, branch text, variant count text. Remove branch filter. Add cost price and selling price columns.

### Layout (compact table-style)

```text
| Product Name | Cost | Sell | [Branch1] | [Branch2] | ... | Warn | Status |
|--------------|------|------|-----------|-----------|-----|------|--------|
| > Chestguard | 5.00 | 8.00 |    10     |     0     |  0  |  5   | In Stk |
|   Size 2     |      |      |    10     |     0     |  0  |      |        |
| Arm Guard    | 3.00 | 6.00 |     0     |     0     |  0  |  —   | OOS    |
```

### Changes to `src/components/sales/InventoryListTab.tsx`

1. **Restructure data**: Group by `product_id` only (not product+branch). For each product, build a map of `branch_id → { total, variants[] }`. This gives one row per product with per-branch quantities.

2. **Remove branch filter** dropdown. Keep search and status filter only.

3. **Add branch columns**: Dynamically render a column header for each branch (from `useBranches`). Each product row shows the branch-level total. Variant sub-rows also show per-branch quantities.

4. **Add Cost/Sell columns**: Fetch `base_price` from products query. Display `cost_per_unit` (avg from inventory) and `base_price` (selling price) as columns.

5. **Remove subtitle text**: No SKU, no branch name, no "X variants" text. Product name only, single line.

6. **Compact styling**: Reduce padding (`py-1.5 px-3`), smaller text (`text-xs`/`text-sm`), use a proper table element for alignment.

7. **Variant cascade**: On click, expand to show variant rows with the same branch columns, each cell showing that variant's quantity at that branch.

### Files to modify
- **Edit**: `src/components/sales/InventoryListTab.tsx` — Full redesign as described above

