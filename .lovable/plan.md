

## Plan: Fix empty product dropdown in invoice edit/adjust mode

### Root cause

In `src/components/sales/InvoiceDialog.tsx`, the `useEffect` that builds `branchAvailableProductIds` (lines 437–474) iterates over the **`products`** array. That array is only populated by `loadProducts()`, which runs **only in create mode** (line 391: `if (!isCreateMode) return;`).

When opening an existing invoice in edit/adjust mode:
- `products` stays `[]`
- The effect builds `branchAvailableProductIds` as an **empty Set** (not `null`)
- The edit-mode product dropdown filter (line 1665) `(!branchAvailableProductIds || branchAvailableProductIds.has(p.id))` rejects every product because the Set is non-null but empty
- Result: dropdown shows **"No products available for this branch."** even though the branch (Morley) has products like *Foundation >> White*

The view/edit dropdown uses `viewProducts` (loaded by `loadViewProducts()` on dialog open), but the availability gate is computed from the wrong source array.

### Fix

**File: `src/components/sales/InvoiceDialog.tsx`**

Change the branch-availability effect to derive `branchAvailableProductIds` from whichever product list is populated:
- Use `products` in create mode (existing behaviour)
- Use `viewProducts` in view/edit mode

Specifically, in the effect at lines 437–474:
1. Add `viewProducts` to the dependency list
2. Pick the source list: `const sourceList = isCreateMode ? products : viewProducts;`
3. Iterate `sourceList` instead of `products` to build the `available` Set
4. If the relevant source list is still empty (initial mount), keep `branchAvailableProductIds = null` so the dropdown isn't gated to nothing while loading

This keeps the existing per-branch hidden-product logic (`price_rules` with `is_active = false`) intact, just sourcing the universe of products from the correct array depending on mode.

### Verification

1. Open an existing Morley invoice → click **Edit/Adjust** → open the Product dropdown on a line item → full Morley product list appears, including *Foundation >> White*; selecting it updates the line correctly.
2. Hidden products (price_rules with `is_active = false` for that branch) still do not appear.
3. Create-mode flow (new invoice) is unchanged — same branch filtering as before.
4. Earl's invoice: product can be switched from *White >> Yellow Tip* to *Foundation >> White*, save, totals recalculate using existing tax-inclusive logic for Morley.

### Out of scope

- Changing how `price_rules` decides availability (still treats only `is_active = false` rows as hides).
- Refactoring `loadProducts` vs `loadViewProducts` into a single source of truth (separate cleanup task).

