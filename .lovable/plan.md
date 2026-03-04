

## Plan: Branch-Restricted Inventory Adjustment with Transfer Option

### Part 1: Restrict Branch Users to Their Own Branch Location

**`src/components/sales/InventoryAdjustmentDialog.tsx`**:
- Add optional `branchId` prop to the dialog interface
- When `branchId` is provided, auto-select that branch's location and hide the location dropdown (branch users can only adjust their own branch)
- When `branchId` is not provided (superadmin context), show all locations as before

**`src/components/dashboard/BranchInventoryTab.tsx`**:
- Pass `branchId` to `InventoryAdjustmentDialog` so the location is locked to the current branch

### Part 2: Add "Transfer" as an Adjustment Type

**`src/components/sales/InventoryAdjustmentDialog.tsx`**:
- Add a third adjustment type button: "Transfer" (with `ArrowRightLeft` icon)
- When "Transfer" is selected, show a "Transfer To" branch dropdown (all branches except current)
- On confirm with transfer type: call `createTransferRequest` from `inventoryTransferService` instead of `adjustInventory` — stock is NOT moved immediately, it creates a pending transfer request requiring superadmin approval
- The existing transfer request approval flow already handles the actual stock movement

### Part 3: Wire Up Props

**`src/components/dashboard/BranchInventoryTab.tsx`**:
- Pass `branchId` prop to `InventoryAdjustmentDialog`

**`src/components/sales/ProductManagementList.tsx`** (superadmin context):
- No `branchId` prop passed — full location access, no transfer option (superadmin can use the existing transfer dialog separately)

### Technical Details
- No database changes needed — `inventory_transfer_requests` table already exists with the approval workflow
- The existing `StockTransferApprovals` component on the superadmin dashboard already handles approval/rejection
- Transfer type only shown when `branchId` is provided (branch context)
- `requested_by` will use the branch name or a context identifier

