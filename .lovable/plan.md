## Add Gaonhae Guard Bundle Discount (Morley only)

Extend the existing bundle discount logic in `src/components/sales/InvoiceDialog.tsx` (around `calculateBundleDiscount`, line 950) to add a new automatic $20 discount when:

- The selected branch is **Morley**, AND
- The invoice contains all three: **Gaonhae Arm Guard**, **Gaonhae Shin Guard**, AND **Gaonhae Male Groin Guard** OR **Gaonhae Female Groin Guard**

### Behavior
- Discount appears as a separate negative line item on save: `Bundle Discount: Gaonhae Arm + Shin + Groin Guard bundle` at `-$20`.
- Reflected live in the dialog totals (green "Bundle Discount" row), same UX as existing Adidas bundle.
- Only applies when branch name (or branch lookup) resolves to "Morley". Other branches: no discount.

### Technical changes
- In `calculateBundleDiscount()`:
  - Look up the selected branch via `branches.find(b => b.id === formData.branch_id)`.
  - If `branch.name?.toLowerCase() === 'morley'`, check item names for `gaonhae arm guard`, `gaonhae shin guard`, and (`gaonhae male groin guard` OR `gaonhae female groin guard`). If all present, add `$20` and push description `'Gaonhae Arm + Shin + Groin Guard bundle'`.
- Update the negative line-item push (line 1030–1032) to use the per-description amount instead of hardcoded `-10`. Change `unit_price: -10, total_override: -10` to a per-bundle amount map (Adidas bundles = 10, Gaonhae bundle = 20), so each discount row carries its correct value.

### Out of scope
- No DB/schema changes. No changes to product catalog. Existing Adidas bundles stay as-is.