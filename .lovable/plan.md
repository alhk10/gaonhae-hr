

## Problem Analysis

Looking at the current code and the screenshot:

1. **Saturday truncated**: The `divide-x` utility adds `border-left: 1px` to 6 cells = 6px extra width. Combined with the Card border and any parent padding, the 7th column overflows. This is the fundamental width issue.

2. **Vertical space**: `min-h-[1.5rem]` (24px) forces every cell — including empty ones — to be at least 24px tall. In a flat grid this means fully-empty rows still take up significant space.

## Solution

### File: `src/components/dashboard/BranchCasualSchedule.tsx`

**Replace the border strategy entirely** — instead of `divide-x divide-y` (which adds border width to cells), use the **background-gap pattern**:
- Grid container: `bg-border gap-px` (1px gap filled by the container's border-colored background)
- Each cell: `bg-background` (covers the gap, creating visual grid lines)
- This adds **zero** extra width to any cell — all 7 columns get exactly 1/7 of the space

**Reduce vertical waste**:
- Remove `min-h-[1.5rem]` from empty cells — they inherit height from the tallest sibling in the same grid row
- Set `min-h-[0.75rem]` only on trailing padding cells (rows that are fully empty)

**Structural changes**:
- Header row: same `bg-border gap-px` pattern, each header cell `bg-muted/30`
- Day grid: single flat `grid grid-cols-7 bg-border gap-px` wrapping all cells
- Wrap entire calendar in `border border-border rounded overflow-hidden` 
- Keep `CardContent` at `px-0 sm:px-2`

All functionality (click-to-manage, color coding, display names, +N more, legend, manage dialog) remains completely intact — only the grid structure and border approach changes.

