## Goal

In the **Add Grading Slots** dialog (`BulkAddGradingSlotsDialog.tsx`):

1. Fix the dropdown so it scrolls properly (currently the popover clips the list).
2. Replace the **Belt Levels** column with a **Grading Products** multi-select (e.g. "White >> Yellow Tip", "Stage 1 - 3").
3. Persist the selected product IDs on the slot, and automatically derive `belt_levels` from each product so existing student eligibility filtering keeps working.

## Belt derivation rules

For each selected grading product, the slot's `belt_levels` is the union of:

- Products named `"<From> >> <To>"` → contributes `<From>` (e.g. `White >> Yellow Tip` → `White`).
- `Stage 1 - 3` → `1st Poom`, `1st Dan`
- `Stage 4 - 10` → `2nd Poom`, `2nd Dan`
- `Stage 11-26` → `3rd Poom`, `3rd Dan`

This keeps all downstream filters (My Classes, slot eligibility, public payment lookup, etc.) unchanged.

## Database change

Add a nullable column on `grading_slots`:

- `grading_product_ids uuid[]` — IDs of the grading-category products this slot is for.

No backfill required (existing slots stay belt-only). `belt_levels` remains the source of truth for eligibility.

## UI / column change

- Rename column header **Belt Levels** → **Grading Products**.
- New `GradingProductPopover` component:
  - Fetches all active products in the `Grading` category, ordered by name.
  - Renders a scrollable checkbox list inside `PopoverContent`.
  - Fix scrolling: wrap the list in an inner `<div className="max-h-72 overflow-y-auto">` (the current `PopoverContent max-h-72 overflow-y-auto` is overridden by Radix' own positioning when the popover bumps the viewport bottom — keeping the scroll on an inner div fixes it). Also set `collisionPadding={8}` on `PopoverContent`.
- Trigger label: "Select products" / "N product(s)".
- Selecting products updates two fields on the row:
  - `grading_product_ids` (new)
  - `belt_levels` (derived via the rules above, deduplicated)
- Title auto-generation uses the selected product names (slice 3 + "…") instead of belt names.

## Service / write path

`createGradingSlot` (in `gradingService.ts`) — add optional `grading_product_ids?: string[]` to its payload and pass it through to the insert. `belt_levels` is still sent (derived in the dialog).

## Files to edit

- `supabase/migrations/<new>.sql` — `ALTER TABLE grading_slots ADD COLUMN grading_product_ids uuid[];`
- `src/services/gradingService.ts` — accept and persist `grading_product_ids`.
- `src/components/sales/BulkAddGradingSlotsDialog.tsx` — replace `BeltLevelPopover` with `GradingProductPopover`, derive belts, fix scroll, rename column, update title generator and row state shape.

## Out of scope

- Editing existing slots elsewhere (only the bulk-add dialog is affected).
- Changing how `belt_levels` is consumed in other components.
- Changing the "Avail. to Branches" dropdown.
