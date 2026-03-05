

## Problem

1. **Location filter shows "Main Store" repeated** -- Every branch has one inventory_location named "Main Store". The InventoryListTab groups/filters by `inventory_locations` instead of branches, making the filter useless (screenshot shows 6x "Main Store").

2. **Chestguard in Yishun has no size variant** -- The inventory record for 10 chestguards in Yishun has `size_variant = null`. The user expects it grouped under "Size 2". This is a data issue -- the adjustment dialog likely didn't capture the size variant when the stock was added. But the display logic also needs to properly reflect branch grouping.

## Plan

### 1. InventoryListTab: Replace location-based grouping with branch-based grouping

**File: `src/components/sales/InventoryListTab.tsx`**

- Replace the "locations" query with a branches query (fetch from `branches` table, exclude Competition/Headquarters)
- Replace the location filter dropdown: label it "All Branches" and list branch names
- Change the grouping key from `product_id + location_id` to `product_id + branch_id` (resolve branch_id via `inventory_locations.branch_id`)
- Display branch name instead of location name in each row
- Update the `ProductGroup` interface: replace `location_id`/`location_name` with `branch_id`/`branch_name`
- For the filter, match on `branch_id` instead of `location_id`

### 2. BranchInventoryTab: Already branch-scoped (no changes needed)

This component already filters by `branchId` prop via location lookup. It works correctly.

### 3. Fix chestguard size assignment

The 10 chestguards in Yishun were added without a `size_variant`. Update the inventory record to set `size_variant = '2'` so it appears under "Size 2" in the cascade view.

- Run a migration or data fix to set `size_variant = '2'` on the Yishun chestguard inventory record (id: `c72d329e-0b59-49f0-ba13-c44b00e77b01`)

### Files to modify
- **Edit**: `src/components/sales/InventoryListTab.tsx` -- Replace location grouping/filtering with branch grouping/filtering
- **Data fix**: Update the Yishun chestguard record to have `size_variant = '2'`

