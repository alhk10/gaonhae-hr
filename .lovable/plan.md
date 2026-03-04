

## Plan: Fix Branch Dashboard Invoice Dialog — Branch Lock, Branch Pricing, Variants & Terms

### Issues Identified

1. **Branch field not restricted**: `CreateInvoiceDialog` in BranchDashboard shows all branches the user has access to, instead of locking to the current branch.
2. **No branch pricing lookup**: When a product is selected, it always uses `base_price`. It should check `price_rules` for a branch-specific override.
3. **Variant support missing**: The dialog maps products to `ProductWithVariants` but only includes `available_variants` (new field). It does NOT include `available_sizes` or `requires_size` — the legacy fields that uniforms actually use. The `sizeOptions` derivation only reads `available_variants?.sizes`, missing `available_sizes`.
4. **Term/slot support exists** but only renders when accessed from the superadmin flow. From BranchDashboard it already works if a branch is selected — this should be fine once the branch is auto-locked.

### Changes

#### 1. Add `branchId` prop to `CreateInvoiceDialog`

**`src/components/sales/CreateInvoiceDialog.tsx`**:
- Add optional `branchId?: string` to `CreateInvoiceDialogProps`
- When `branchId` is provided: auto-set `formData.branch_id` to it on open, hide the branch dropdown, and skip the `availableBranches` filtering logic (just show the branch name as text)
- Also auto-trigger `loadBranchTerms(branchId)` on open

#### 2. Pass `branchId` from BranchDashboard

**`src/components/dashboard/BranchDashboard.tsx`**:
- Pass `branchId={branchId}` to `<CreateInvoiceDialog>`

#### 3. Add branch pricing lookup

**`src/components/sales/CreateInvoiceDialog.tsx`**:
- When a product is selected (`handleProductChange`), fetch the branch-specific price from `price_rules` table for the selected `formData.branch_id`
- If a `price_override` exists and `is_active`, use it instead of `base_price`
- Add a helper function `getBranchPrice(productId, branchId)` that queries `price_rules`

#### 4. Fix variant support for uniforms

**`src/components/sales/CreateInvoiceDialog.tsx`**:
- Extend `ProductWithVariants` to include `available_sizes?: string[]` and `requires_size?: boolean`
- In `loadProducts`, also map `available_sizes` and `requires_size`
- Update `sizeOptions` derivation: merge `available_variants?.sizes` with `available_sizes` (use whichever has data, with `available_sizes` as fallback)
- Add size validation in `addItem` — if product `requires_size` or has `available_sizes`, require selection

### Technical Details
- No database changes needed — `price_rules` table already stores branch-specific overrides
- The `getProductBranchPrices` service function already exists but is too heavy (fetches all branches). Instead, a targeted query for a single branch will be used inline
- Term/slot support already works once `branch_id` is set; locking the branch ensures terms load immediately on dialog open

