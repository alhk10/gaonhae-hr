# Edit age and belt limits directly in Uniforms & Guards settings

Make the Restrictions column in the Uniforms & Guards settings dialog editable, so staff can change limits without going to Product Management.

## What changes
- **Age**: two small "from" / "to" boxes, the same as the School Fees class settings. Leave a box blank for no limit.
- **Belts**: a "From belt" and "To belt" dropdown in belt order, plus an "All belts" choice. Saving stores every belt in that range.
- Changed rows count toward the Save button total, alongside price and availability changes.
- A note in the dialog says age and belt limits apply at every branch, because they belong to the product.
- On phones, the same fields stack under the item name.
- Packages keep showing their limits but can't be edited, because they are not single products.

## Technical details
- New SECURITY DEFINER function `admin_set_guards_product_restrictions(p_product_id, p_min_age, p_max_age, p_belts text[], p_actor)`. It follows the existing `admin_set_class_product_age_range` pattern: it checks that min ≤ max and that every belt is valid, then updates `products.min_age/max_age/allowed_belt_levels`. An empty array is saved as null.
- Add `setGuardsProductRestrictions` to `guardsPurchaseService.ts`.
- `GuardsProductSettingsDialog.tsx`: extend `DraftRow` with minAge/maxAge/beltFrom/beltTo, include them in dirty checks, and save them with the new function. After saving, refresh `guards-branch-products` and `public-guards-products`.
- Belt ranges come from `BELT_LEVELS_ARRAY` order. If an item's saved belts are not one continuous range, it shows "Custom" until someone changes it.
