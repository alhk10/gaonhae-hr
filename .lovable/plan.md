

## Plan: Use Database Branch Colors in View & Edit Bookings Calendar

Currently the dialog uses a hardcoded HSL color palette assigned by index. The branches table already stores a `color` field per branch (e.g., `bg-blue-500`), used consistently across the slot booking module. This plan aligns the dialog with that system.

### Changes to `src/components/dashboard/SlotBookingBranchChangeDialog.tsx`

1. **Fetch branch colors from DB**: Update the branches query to include the `color` field (currently only fetches `id, name`).
2. **Replace hardcoded `BRANCH_COLORS` palette**: Remove the HSL array. Instead, build `branchColorMap` from the fetched branch data using `convertTailwindColorToHex` from `src/utils/colorUtils.ts`.
3. **Update calendar modifiers**: Use the converted hex colors for `backgroundColor` (with alpha) and `color` in `branchModifiersStyles`.
4. **Update legend swatches**: Use the same hex color for the legend dots.
5. **Import `convertTailwindColorToHex`** from `@/utils/colorUtils`.

This ensures colors match exactly what users see in the admin monthly calendar and branch selector throughout the app.

