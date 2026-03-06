

## Plan: Mobile Day-by-Day Timetable View

### Problem
The weekly timetable currently uses a 7-column grid with `min-w-[800px]` and horizontal scrolling, which is unusable on mobile.

### Solution
On mobile (`sm:` breakpoint), switch from the 7-column grid to a vertical stacked list showing one day at a time with day navigation tabs, or simply stack all days vertically. A day-by-day accordion/tab approach is cleanest.

**Approach: Vertical day stack on mobile, grid on desktop**

### Changes to `src/components/dashboard/BranchWeeklyTimetable.tsx`

1. **Remove `min-w-[800px]` wrapper on mobile** — only apply it on `sm:` and above
2. **Mobile layout**: Stack days vertically as collapsible sections or simple cards, each showing the day header and its slots beneath
3. **Desktop layout**: Keep existing 7-column grid unchanged

Specifically:
- Wrap the grid in responsive classes: `flex flex-col gap-2 sm:grid sm:grid-cols-7 sm:gap-2`
- Remove the `min-w-[800px]` div — use `sm:min-w-[800px]` or remove entirely since the grid handles it
- On mobile, each day card becomes a full-width row with the day header on the left and slots flowing to the right or below
- Reduce `min-h-[200px]` to `min-h-0` on mobile
- Day header: horizontal layout on mobile (`flex items-center gap-2 p-2`) showing "Mon 3" inline, vertical on desktop (current centered layout)
- Keep ScrollArea only for desktop: conditionally wrap or use `overflow-auto` only on `sm:`

### Scope
Single file change: `src/components/dashboard/BranchWeeklyTimetable.tsx`. CSS/layout only, no logic changes.

