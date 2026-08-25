# Fix Collect checkbox and uniform sizes on Uniforms & Guards list

## What's wrong

1. **Variant dropdowns don't save (so Collect stays greyed out).** The list reads rows through a public database function, but writing a size/colour choice and ticking "Collected" write straight to the `guards_purchases` table. Those writes are only allowed for signed-in staff with branch access, so on the password-gated `/access` page the update silently affects zero rows: the dropdown appears set, refetch wipes it, and the Collected checkbox never unlocks.
2. **Uniform sizes are wrong.** Uniform products have no size list stored, so the app falls back to XS–XL. They should use numeric sizes per product (see below).
3. **No explanation when Collect is greyed out** beyond a small "Select all variants" note.

## What will change

- Saving a variant size/colour/gender and toggling Collected will work on the `/access` list (and keep working for signed-in staff).
- Uniform items show the correct numeric sizes on both the public `/guards` page and the staff list dropdowns:
  - Adidas White Uniform, Gaonhae White Uniform: 100, 110, 120, 130, 140, 150, 160, 170, 180, 190
  - Adidas Poom Uniform: 120, 130, 140, 150, 160, 170
  - Adidas Poomsae uniforms (Male/Female, Junior/Senior), Adidas Dan Uniform, Adidas Dan Champ II Uniform: 150, 160, 170, 180, 190
- When the Collected checkbox is disabled, the row shows the exact reason:
  - "Verify first" — payment not yet verified
  - "Select variants first" — verified but sizes/colours missing
  - "Verify and select variants first" — both outstanding

## Technical notes

- **Migration**: two `SECURITY DEFINER` functions, granted to `anon` and `authenticated`, mirroring the existing public guards RPC pattern:
  - `public_set_guards_variant_selections(p_id uuid, p_selections jsonb)`
  - `public_set_guards_collected(p_id uuid, p_collected boolean, p_by text)` — also sets `collected_at` / `collected_by`.
- **Data update**: set `available_sizes` on each uniform product per the lists above (white uniforms 100–190, Poom uniform 120–170, Poomsae/Dan uniforms 150–190).
- `src/services/guardsPurchaseService.ts`: route variant-selection updates and `setGuardsCollected` through the new RPCs (keep the existing collection-email side effect); in `getComponentsForCart`, use the item's stored `sizes` when present instead of defaulting to XS–XL.
- `src/pages/public/PublicGuardsPurchaseList.tsx`: use the new save path, surface a toast on failure, and replace the single "Select all variants" hint with the three-state reason text.
