

## Analysis

From the screenshot, two problems persist:

1. **Saturday column truncated**: The 7-column grid exceeds the Card's available width. The `border-r` on each cell plus card padding (`px-1 sm:px-3`) consumes space, and there's no mechanism to force all 7 columns to fit.

2. **Excessive vertical space**: The per-week independent grid rows approach means each week is a separate `div.grid-cols-7`. Empty cells in a week row still occupy height from the `border-b` and any implicit minimum sizing. The user explicitly wants a **single flat grid** where all cells are uniform.

## Plan

### File: `src/components/dashboard/BranchCasualSchedule.tsx`

**Calendar grid rewrite** (lines 202-264):

1. **Single flat grid**: Replace the per-week `div` approach with one `<div className="grid grid-cols-7">` containing all cells (padding cells + day cells + trailing cells). This naturally equalizes all row heights.

2. **Force 7 columns to fit**: Use `table-fixed`-style approach — set each column to `w-[calc(100%/7)]` or simply rely on `grid-cols-7` with `min-w-0` on both the grid and each cell. Remove all horizontal borders (`border-r`) and use a single `border` + `divide-x divide-y` pattern via Tailwind's divide utilities, which add no extra width.

3. **Compact cells**: Remove all padding beyond `p-[2px]`. Keep text at `text-[8px] sm:text-[9px]`. Day number at `text-[9px] sm:text-[10px]`.

4. **Zero card padding on mobile**: Change `CardContent` padding to `px-0 sm:px-2`.

5. **Outline border on grid**: Single `border border-border rounded` on the outer grid container, with `divide-x divide-y divide-border` for internal lines — this avoids double-border width issues.

The structure becomes:
```text
<div class="grid grid-cols-7 border border-border divide-x divide-y divide-border">
  {emptyCells}  <!-- startDayOfWeek empties -->
  {dayCells}    <!-- actual month days -->
  {trailCells}  <!-- pad to multiple of 7 -->
</div>
```

Each cell: `<div class="min-w-0 p-[2px] overflow-hidden min-h-[2rem]">` — the `min-h-[2rem]` gives a small baseline so empty cells aren't zero-height, but content-heavy cells grow naturally and all cells in the same CSS grid row equalize.

All existing functionality (click to manage, color coding, display names, +N more, legend, manage dialog) is preserved unchanged.

