## Problem
On `/guardspurchase-list`, the Gaonhae Set's groin guard component is auto-resolved from the student's registered gender. Staff cannot override it, so if the gender on the purchase is missing/wrong, there is no way to pick Male vs Female Groin Guard before invoicing.

## Change
Add a **Gender** dropdown (Male / Female) next to the Groin Guard row in the Variants column, alongside the existing Size select. Staff must pick gender before Collected is enabled, and the chosen variant flows into the invoice.

## Implementation

**`src/services/guardsPurchaseService.ts`**
- Replace the auto-resolved groin entry in `getComponentsForCart` with a single virtual spec for the groin guard that requires both a gender and a size, e.g.:
  - Add a new field `genderChoice?: boolean` on `PurchaseComponentSpec` and emit one entry with `product_id: 'gaonhae_groin'` (sentinel), `name: 'Gaonhae Groin Guard'`, sizes `XS–XL`, `genderChoice: true`.
- Extend `VariantSelection` to carry an optional `gender: 'male' | 'female'` for the groin entry.
- Update `isVariantSelectionComplete` to require `gender` when `genderChoice` is true (in addition to size).
- In `createInvoiceForPurchase` / `buildLinesForKey`, resolve the groin `product_id` from `selections['gaonhae_groin'].gender` (fall back to purchase gender if still set), then write the correct male/female product id with its size into `size_variant` + metadata.

**`src/pages/public/PublicGuardsPurchaseList.tsx`**
- When rendering the groin component row, render a compact `h-7 text-xs` Gender select (Male / Female) before the Size select. Persist into `variant_selections` under the `gaonhae_groin` key.
- Keep Collected gating: now also blocked until gender is chosen.

No DB migration needed (uses existing `variant_selections` JSONB).

## Out of scope
- Public `/guards` form (gender stays optional there).
- Adidas set variants (unchanged).
- Superadmin matching UI.