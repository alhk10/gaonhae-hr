

## Plan: Fix Invoice Card Layout for Mobile

### Problem
The invoice card on mobile is too small, causing text truncation for invoice number, date, amount, and status. The layout crams everything into a tight horizontal row.

### Changes

**File: `src/components/dashboard/StudentDashboard.tsx`** (lines 1055-1097)

1. **Switch to vertical stack on mobile**: Change from `flex items-center justify-between` to a stacked layout on mobile — invoice info on top row, actions on bottom row.
2. **Reduce text sizes on mobile**: Use `text-sm` for invoice number and `text-xs` for date/amount to prevent truncation.
3. **Full-width card**: Increase padding slightly from `p-2` to `p-3` on mobile.
4. **Layout restructure**:
   - Top row: invoice number, date (left) | amount, status badge (right)
   - Bottom row: Pay button + PDF button (right-aligned)
   - This gives each piece of info more horizontal space.

### Files to modify
- `src/components/dashboard/StudentDashboard.tsx`

