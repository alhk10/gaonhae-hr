## Problem
`ProductVariantManager` dialog only shows Size & Color tabs. Need a third **Competition** tab with 9 preset categories.

## Changes

### 1. `src/services/variantTypesService.ts`
- Add `competitions?: string[]` to `ProductVariants`.
- Update `flattenVariants` and `calculateVariantCombinations` to include competitions.

### 2. `src/services/productService.ts`
- Add `competitions` to `ProductVariants` interface and `parseVariants` (read from `available_variants` JSON).

### 3. `src/components/sales/ProductVariantManager.tsx`
- Add `Trophy` icon + amber color class for `competition`.
- Extend `enabledTypes` prop to `{ size, color, competition }`.
- Change `TabsList` to `grid-cols-3`, add Competition tab/content.
- Extend `getVariantArray` / `setVariantArray` / state for `competition` → `currentVariants.competitions`.
- Built-in fallback preset "Competition Categories": Individual, Pair, Team, Kyorugi, Family, Speed Kicking, Board Breaking, High Jump Kick, Long Jump Kick (used if DB has no `competition` variant type).
- Include competitions in summary block + badges.

### 4. `src/components/sales/AddProductDialog.tsx` & `EditProductDialog.tsx`
- Initialise `available_variants` with `competitions: []`.
- Track `competition` in `enabledVariantTypes` state; hydrate from saved product; persist on save.
- Show "Competitions: N" in variant summary row.

## Out of scope
Variant-combo generation (e.g. `Red / L / Pair`) and inventory/invoice flows — competitions persist alongside sizes/colors for a later phase.
