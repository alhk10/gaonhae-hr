

## Plan: Branch Inventory Tab with Stock Transfer Approvals

### Database

**New table: `inventory_transfer_requests`**
- `id` UUID PK DEFAULT gen_random_uuid()
- `from_branch_id` TEXT NOT NULL (requesting branch)
- `to_branch_id` TEXT NOT NULL (destination branch)
- `product_id` TEXT NOT NULL REFERENCES products(id)
- `quantity` INTEGER NOT NULL
- `size_variant` TEXT
- `reason` TEXT
- `status` TEXT DEFAULT 'pending' (pending / approved / rejected)
- `requested_by` TEXT NOT NULL (employee email)
- `approved_by` TEXT
- `approved_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

**RLS**: SELECT for superadmins + employees in from/to branch; INSERT for branch staff; UPDATE for superadmins only.

### New Components

1. **`src/components/dashboard/BranchInventoryTab.tsx`** — Inventory tab for BranchDashboard
   - Shows inventory items filtered by branch's `inventory_locations`
   - Allows quantity adjustment (via existing `InventoryAdjustmentDialog`)
   - "Request Transfer" button opens a dialog to request stock transfer to/from another branch
   - Lists pending transfer requests for this branch

2. **`src/components/dashboard/StockTransferRequestDialog.tsx`** — Dialog to create a transfer request
   - Select product, destination branch, quantity, reason
   - Inserts into `inventory_transfer_requests` with status 'pending'

3. **`src/components/dashboard/StockTransferApprovals.tsx`** — Approval section for SuperadminDashboard
   - Lists pending transfer requests with from/to branch, product, quantity
   - Approve: executes inventory adjustment (subtract from source, add to destination) and updates status
   - Reject: updates status to 'rejected'

### Service

**`src/services/inventoryTransferService.ts`**
- `createTransferRequest(data)` — insert into `inventory_transfer_requests`
- `getPendingTransferRequests()` — fetch all pending requests with product/branch names
- `approveTransferRequest(id, approvedBy)` — update status, call `adjustInventory` for both locations
- `rejectTransferRequest(id, approvedBy)` — update status to rejected
- `getTransferRequestsByBranch(branchId)` — fetch requests for a specific branch

### Integration

**`BranchDashboard.tsx`**: Add "Inventory" tab trigger between existing tabs. Renders `BranchInventoryTab` with `branchId` prop.

**`SuperadminDashboard.tsx`**: Add `StockTransferApprovals` component in the overview section alongside existing approval sections.

### Files to Create/Modify

| File | Action |
|---|---|
| Migration SQL | Create `inventory_transfer_requests` table + RLS |
| `src/services/inventoryTransferService.ts` | Create |
| `src/components/dashboard/BranchInventoryTab.tsx` | Create |
| `src/components/dashboard/StockTransferRequestDialog.tsx` | Create |
| `src/components/dashboard/StockTransferApprovals.tsx` | Create |
| `src/components/dashboard/BranchDashboard.tsx` | Add Inventory tab |
| `src/components/dashboard/SuperadminDashboard.tsx` | Add transfer approvals |

