

## Plan: Three Features

### 1. Invoice Deletion Approval for Branch Access Users

**Current behavior**: Branch dashboard users can directly delete invoices (calls `deleteInvoice` immediately in `handleDelete`).

**Desired behavior**: Non-superadmin users must submit a deletion request instead. The existing `invoiceDeletionRequestService` already supports this workflow (`createInvoiceDeletionRequest`, approval/rejection). The superadmin dashboard already shows `InvoiceDeletionApprovals`.

**Changes**:
- **`BranchDashboard.tsx`**: Import `useAuth` (already imported) and destructure `userrole`. In `handleDelete`, check if `userrole !== 'superadmin'`. If non-superadmin, call `createInvoiceDeletionRequest(deleteTarget.id)` instead of `deleteInvoice(deleteTarget.id)`, and show a toast like "Deletion request submitted for approval". If superadmin, keep the direct delete. Update the delete confirmation dialog text to indicate "request deletion" for non-superadmins.

### 2. Show Inventory Items Even with 0 Stock

**Current behavior**: `BranchInventoryTab` already fetches all products and shows items with 0 stock. The `filteredGroups` computation already includes products with no inventory items (line 98-127). This appears to already work. No changes needed unless the filtering is hiding zero-stock items somewhere else.

### 3. Add "Warn if Fall Below" Column + Superadmin Warning Section

**a) Add `warn_below` column to `inventory_items` table** (or to `products` table — products table makes more sense as it's a product-level setting, not per-location).

Since the schema already has `reorder_point` on `inventory_items`, we can repurpose that or add a new `warn_below_quantity` column on the `products` table. Given that `reorder_point` exists per inventory item (per location), a product-level `warn_below_quantity` is cleaner for a global warning threshold.

**Option**: Add a `warn_below_quantity` integer column to the `products` table via migration.

**b) `BranchInventoryTab.tsx`**: Add a "Warn Below" column showing the threshold. Allow inline editing or show it as display-only. Fetch the field from products.

**c) Superadmin Dashboard**: Add a new `LowStockWarnings` section that queries all products where current stock across branches falls below `warn_below_quantity`. Show product name, branch, current stock, and threshold.

**Files to modify**:
1. `src/components/dashboard/BranchDashboard.tsx` — Invoice deletion approval logic
2. `src/components/dashboard/BranchInventoryTab.tsx` — Add "Warn Below" column display + inline edit
3. `src/components/dashboard/SuperadminDashboard.tsx` — Add low stock warnings section
4. New: `src/components/dashboard/LowStockWarnings.tsx` — Component showing products below warn threshold
5. New Supabase migration — Add `warn_below_quantity` column to `products` table

