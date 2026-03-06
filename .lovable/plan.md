

## Plan: Mobile-Friendly Dashboard Tabs and Compact Student List

### Problem
The DashboardSwitcher tabs (Overview, Branch, Employee, Student) show as a single scrollable line on mobile, getting cut off. The Branch Dashboard content including its tabs and student list need smaller font sizes, tighter padding, and a 2-line per row layout for mobile.

### Changes

**1. `src/components/dashboard/DashboardSwitcher.tsx` — 2-line tab layout on mobile**
- Change `TabsList` from `overflow-x-auto` to `grid grid-cols-2 sm:flex sm:w-auto w-full` so the 4 tabs display as a 2x2 grid on mobile, wrapping into 2 lines.

**2. `src/components/dashboard/BranchDashboard.tsx` — Compact mobile styling**

*Header:*
- Reduce title from `text-2xl` to `text-lg sm:text-2xl`

*Branch tabs (lines 352-362):*
- Add smaller text on mobile: `text-xs` on TabsTriggers
- Ensure `flex-wrap` continues to work for multi-line wrapping

*Student list (lines 437-465):*
- Convert from single-line horizontal layout to a 2-line stacked layout on mobile:
  - **Line 1**: Name (bold, uppercase) + belt badge + status badge
  - **Line 2**: Phone + email (smaller, muted)
- On desktop, keep the current single-line layout
- Use `flex-col sm:flex-row` pattern for responsive switching
- Reduce padding: `px-2 py-1.5 sm:px-3 sm:py-2`

*Invoice & Payment section:*
- Reduce CardHeader padding on mobile
- Smaller font sizes for mobile

### Scope
Only UI/CSS changes — no database or logic changes needed. Two files modified.

