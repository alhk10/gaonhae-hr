

## Three Issues to Fix

### 1. Navbar Horizontal Scroll
**Problem**: On narrower desktop/tablet viewports (>768px but <1024px), the desktop menu renders all buttons inline (email + Set PIN + Lock Now + Change Password + Logout), causing horizontal overflow.

**File**: `src/components/layout/Navbar.tsx`
- Wrap the desktop action buttons with `flex-wrap` and reduce spacing
- Hide button text labels below `lg` breakpoint, showing only icons
- Add `overflow-hidden` to the nav container to prevent scroll

### 2. Calendar Truncation (Saturday Column Cut Off)
**Problem**: The 7-column grid inside the Card doesn't fit on narrow viewports. The Card's padding + parent layout padding eat into available width.

**File**: `src/components/dashboard/BranchCasualSchedule.tsx`
- Add `overflow-x-auto` on the calendar container so it scrolls horizontally if needed rather than being clipped
- Alternatively, set `min-w-0` on the card to allow it to shrink below its content size

### 3. Vertical Space in Day Cells
**Problem**: Every day cell has `h-14` (56px) fixed height. Empty days and days with 1 booking waste space. Since each week is already rendered as an independent grid row, removing the fixed height will let cells size to content — the tallest cell in a week determines that week's row height.

**File**: `src/components/dashboard/BranchCasualSchedule.tsx`
- Replace `h-14` with `min-h-[1.5rem]` on all day cells (empty and active)
- This lets CSS grid size each week-row to the tallest cell's content, eliminating wasted space

