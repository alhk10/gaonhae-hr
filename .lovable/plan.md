

## Plan: Show All Products in Branch Inventory (Including 0 Stock)

### Problem
Currently, only products with existing `inventory_items` records for the branch are shown. Products without inventory records are hidden.

### Change: `src/components/dashboard/BranchInventoryTab.tsx`

1. **Add a new query** to fetch all products from the `products` table
2. **Merge** products with inventory items: for each product, find matching inventory records; if none exist, default to `quantity_on_hand: 0`
3. **Update `filteredItems`** to iterate the merged list instead of raw `inventoryItems`
4. **Remove the `enabled: locationIds.length > 0` guard** on inventory query (still fetch products even with no locations)
5. The adjust button and transfer dialog remain unchanged

Single file modification only.

