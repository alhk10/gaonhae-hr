# Show age and belt restrictions in Uniforms & Guards settings

## What changes
- The Uniforms & Guards availability screen in /access gets a new **Restrictions** column between Item and Default.
- Each row shows:
  - **Age**: e.g. "Age 7–12", "Age 7+", "Up to 12", or "All ages" when no limit is set.
  - **Belt**: a short summary of the allowed belts, e.g. "1st Dan – 5th Dan" or "Green – 5th Dan", or "All belts" when no restriction is set. Hovering shows the full belt list.
- Packages show "All ages · All belts".
- On narrow screens the restriction appears under the item name instead of a separate column.
- Read-only: restrictions are still edited in Product Management. Availability and price saving are unchanged.

## Technical details
- Migration: update `get_guards_products_for_branch_admin` to also return `min_age`, `max_age`, `allowed_belt_levels` (NULL for packages).
- `src/services/guardsPurchaseService.ts`: add those fields to `GuardsBranchAdminItem`.
- `GuardsProductSettingsDialog.tsx`: add the column; belt summary uses belt ordering from `src/constants/beltLevels.ts` to show first–last allowed belt.
