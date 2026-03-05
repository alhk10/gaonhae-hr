

## Analysis

The screenshot shows the **InventoryListTab** (sales module), not the BranchInventoryTab. This component only queries the `inventory_items` table, so products with zero stock (no inventory records) don't appear at all. The BranchInventoryTab already handles this correctly by fetching all products separately.

The LowStockWarnings component and `warn_below_quantity` column on products were already added in the previous implementation. The remaining work is fixing the InventoryListTab.

## Plan

### 1. Fix InventoryListTab to show all products including 0 stock

**File: `src/components/sales/InventoryListTab.tsx`**

- Add a query to fetch all non-service products (like BranchInventoryTab does)
- Cross-reference with inventory_items to build a complete list
- For products with no inventory records, generate synthetic rows with 0 quantities
- This ensures every product appears in the list regardless of stock level

### 2. Add "Warn Below" column to InventoryListTab

**File: `src/components/sales/InventoryListTab.tsx`**

- Include `warn_below_quantity` in the products query
- Add a "Warn Below" table column header between "Cost/Unit" and "Status"
- Display the threshold value or "—" if not set
- Factor the `warn_below_quantity` into the `getStockStatus` logic: if a product has a `warn_below_quantity` set and current stock is at or below that threshold, mark it as `low_stock`

### 3. Superadmin dashboard warning section

Already implemented via `LowStockWarnings` component in the previous round. No changes needed.

### Files to modify
- **Edit**: `src/components/sales/InventoryListTab.tsx` — Fetch all products, show 0-stock items, add warn_below column

