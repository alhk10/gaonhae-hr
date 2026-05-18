## Problems

1. **Single-slot dialog missing grading products.** `AddGradingSlotDialog` only captures `belt_levels`, but the DB column `grading_product_ids` exists and the bulk dialog already uses it. Single-slot creation/edit cannot attach products.
2. **"Provisional Pass Grading Confirmation" visible to all belts.** `StudentDashboard` fetches grading slots filtered by branch + age only — `slot.belt_levels` is never compared against `student.current_belt`, so a slot restricted to `1st Poom` shows up for every student.
3. **Product belt-level criteria not persisted on edit.** In `EditProductDialog` (and `AddProductDialog`), when the "Requires specific belt level" checkbox is unchecked or no belts are selected, `allowed_belt_levels` is sent as `undefined`. Supabase's JS client strips undefined keys, so previously stored values are never cleared. Same shape applies to age min/max in some paths.

## Changes

### 1. `src/components/sales/AddGradingSlotDialog.tsx`
- Add `grading_product_ids: string[]` to local form state, init from `editSlot`/`duplicateSlot`.
- Load grading products (category = `Grading`, `is_active = true`) once on open, same query the bulk dialog uses.
- Add a multi-select popover (mirrors the existing belt-levels popover) labelled "Grading Products" placed above "Belt Levels".
- When products change, auto-derive `belt_levels` from each product's name prefix (e.g. `1st Poom >> 2nd Poom` → `1st Poom`) — same `deriveBeltLevels` helper used by the bulk dialog (extract into shared util if not already).
- Include `grading_product_ids` in the create/update payload (empty array → `null`).

### 2. `src/components/dashboard/StudentDashboard.tsx` (grading slot query, ~line 189)
- After the age filter, also filter by belt:
  - If `slot.belt_levels` is non-empty, require `slot.belt_levels.includes(student.current_belt)`.
  - If empty/null, keep the slot (no restriction).
- This makes the Provisional Pass slot (belt_levels = `['1st Poom']`) hidden from non-1st-Poom students automatically.

### 3. `src/components/sales/EditProductDialog.tsx` and `src/components/sales/AddProductDialog.tsx`
- Replace the `undefined` payload pattern with explicit `null`/`[]` so cleared values are actually written:
  - `allowed_belt_levels`: `formData.requires_belt_level && formData.allowed_belt_levels.length > 0 ? formData.allowed_belt_levels : null`
  - When `requires_belt_level === false`, force `allowed_belt_levels: null` regardless of the array's contents.
- Apply the same `null`-on-clear treatment to `min_age`/`max_age` (already correct) and any other criteria field that uses the same pattern.

### 4. Verification
- Open an existing slot and confirm the products + belts persist after save.
- Log in as a non-1st-Poom student and confirm the Provisional Pass slot no longer appears in the grading dialog.
- Edit a product, uncheck "Requires specific belt level", save, reopen — the criteria must be empty in DB and UI.

No schema changes required; `grading_product_ids` already exists on `grading_slots`.
