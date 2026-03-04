

## Make Calendar Rows Truly Content-Driven

**Problem**: Calendar rows still have excess vertical space. Each row should only be as tall as the maximum number of bookings in any day of that week.

**File**: `src/components/dashboard/BranchCasualSchedule.tsx`

**Changes**:

1. **Remove `min-h-[28px]` from empty padding cells** (line 211) — let them be zero-height, sized only by the implicit grid row
2. **Reduce date number margin** from `mb-1` to `mb-0` (line 224) — tighten space between date and bookings
3. **Remove `space-y-0.5`** from bookings container (line 227) — use `gap-px` or `gap-0.5` via flex instead for tighter stacking
4. **Add `leading-tight`** to booking name badges for tighter line height

These micro-spacing reductions will compound to make each row significantly shorter, especially weeks with only 1-2 bookings per day. The CSS grid already auto-sizes each row independently, so weeks with 5 bookings will naturally be taller than weeks with 1.

