

## Plan: Compact Student Dashboard Design

### Changes

**File: `src/components/dashboard/StudentDashboard.tsx`**

1. **Remove subtitle** — Delete lines 728-730 (`<p>Manage your profile, view invoices, and track your progress</p>`).

2. **Make tabs wrap instead of scroll** — Change TabsList from `flex-nowrap` to `h-auto flex-wrap` so tabs flow onto a second line on narrow screens instead of horizontally scrolling.

3. **Compact stats cards** — Reduce padding, font sizes, and icon sizes in the 3 stats cards (Sessions Remaining, Outstanding Balance, Current Belt) for a denser layout.

### Files to modify
- **Edit**: `src/components/dashboard/StudentDashboard.tsx`

