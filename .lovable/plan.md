

## Plan: Default Morley (and all AU branches) to Tax Included

### Root cause

When **Create Invoice** opens from the Morley branch dashboard, the dialog receives `lockedBranchId` and seeds `formData.branch_id` directly — but never runs the country → tax-mode lookup. That lookup only fires inside `handleInputChange('branch_id', …)` when a user manually changes the branch in the dropdown. Result: `taxIncluded` stays `null` and the calculation falls back to the country default *only if* `branches` is already loaded at the moment totals are computed; in the locked-branch flow, branches load asynchronously and the dropdown is hidden, so the tax mode often resolves before the country is known and stays "Tax Excluded".

Australia is already configured as `true` in `COUNTRY_TAX_INCLUDED` (`src/config/constants.ts`), so no constants or DB changes are needed — only the initialization is broken.

### Fix

**File: `src/components/sales/InvoiceDialog.tsx`**

Add an effect that, in create mode, applies the country tax default whenever `formData.branch_id` is set and `branches` has loaded — but only if the user hasn't manually overridden via the **Tax Mode** dropdown (`taxManuallySet.current`).

```ts
useEffect(() => {
  if (!isCreateMode) return;
  if (taxManuallySet.current) return;
  if (!formData.branch_id || branches.length === 0) return;
  const selectedBranch = branches.find(b => b.id === formData.branch_id);
  const country = selectedBranch?.country || null;
  setTaxIncluded(country ? (COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED) : DEFAULT_TAX_INCLUDED);
}, [formData.branch_id, branches, isCreateMode]);
```

This covers three flows that are currently broken:
1. Dialog opened from Morley branch dashboard with `lockedBranchId` → AU → defaults to **Tax Included**.
2. Dialog opened with no branch, then branch chosen → already worked, still works (effect is a no-op because `handleInputChange` already set it).
3. Existing invoice opened in **edit** mode → unaffected (effect skipped via `isCreateMode` guard; existing invoice's stored `tax_included` is honored).

### Verification

- Open Create Invoice from Morley branch dashboard → header shows **Tax Mode: Tax Included** → adding $445 of items shows Subtotal $445 / Tax $40.45 (inclusive split), not $445 + $44.50.
- Open Create Invoice from a Singapore branch → defaults to **Tax Excluded** (9% added on top), unchanged.
- Manually flip the Tax Mode dropdown → effect respects the override and does not snap back.
- Open an existing AU invoice in edit mode → its stored tax mode is preserved, no auto-override.

### Out of scope

- Per-branch tax override column on `branches` (Australia-wide default suffices for now; revisit if a single AU branch ever needs to differ).
- Recomputing totals on already-saved invoices.

