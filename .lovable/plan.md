

## Plan: Allow Negative Inventory & Show Login Alert for Negative Stock

### Part 1: Remove Negative Inventory Restrictions

**`src/services/inventoryService.ts`** — Two changes in `adjustInventory()`:
1. **Line 164-166**: Remove the `if (newQuantity < 0)` check that throws "Insufficient inventory for this adjustment" — allow the update to proceed with negative values.
2. **Lines 178-181**: Remove the `if (quantityDelta < 0)` check that throws "Cannot create inventory with negative quantity" — allow creating inventory records with negative quantities.

**`src/components/dashboard/BranchInventoryTab.tsx`** — Update `getStockBadge()` (line 134):
- Add a "Negative" badge (red) for `qty < 0`, keep "Out of Stock" for `qty === 0`.

**`src/components/sales/InventoryListTab.tsx`** — Update `getStockStatus()` (line 78) and `renderStatusBadge()`:
- Add a "negative" status for items where available quantity is below zero, with a distinct red badge.

### Part 2: Negative Inventory Popup on Dashboard Login

Create a new component **`src/components/dashboard/NegativeInventoryAlert.tsx`**:
- On mount, query `inventory_items` for all items with `quantity_on_hand < 0`, joined with `products` for names and `inventory_locations` / `branches` for branch names.
- If negative items exist, show a Dialog listing them (product name, branch, size variant, current quantity).
- Include a "Dismiss" button and optionally a "Go to Inventory" link.
- Use `sessionStorage` to only show once per session (key like `negative_inventory_dismissed`).

**`src/components/dashboard/SuperadminDashboard.tsx`** and **`src/components/dashboard/BranchDashboard.tsx`**:
- Import and render `<NegativeInventoryAlert />` (for BranchDashboard, pass `branchId` to filter).

### Technical Details
- No database migration needed — `quantity_on_hand` column already has no CHECK constraint preventing negatives.
- The popup queries on dashboard mount and only shows if there are negative inventory records.
- Session-based dismissal prevents repeated popups during the same browser session.

