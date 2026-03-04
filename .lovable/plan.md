

## Reduce Vertical Space in Calendar Day Cells

**Problem**: The CSS grid creates equal-height rows per week, so if one day has 3 bookings, all days in that row stretch to match. Combined with padding, this creates excess whitespace.

**File**: `src/components/dashboard/BranchCasualSchedule.tsx`

### Changes

1. **Add `auto-rows-min`** to the grid container (line 202) — this tells CSS grid to size each row to its minimum content height instead of stretching to fill
   - Change: `grid grid-cols-7 gap-px` → `grid grid-cols-7 auto-rows-min gap-px`

2. **Add `items-start`** to the grid so cells align to top instead of stretching vertically

3. **Reduce cell padding** from `p-0.5` to `p-px` on day cells (lines 211, 222) for tighter layout

These changes will make each week-row only as tall as the day with the most bookings in that row, eliminating the excess vertical whitespace visible in the screenshot.

