

## Plan: Compact Student Portal Layout

### Problem
The student portal has excessive padding and spacing, especially on mobile. The Profile, Invoices, and My Classes tabs use spacious card layouts with large headers and descriptions that waste screen space.

### Changes

**File: `src/components/layout/ResponsiveLayout.tsx`**
1. Reduce main content padding on mobile from `p-2` to `p-1.5`, keep desktop at `p-3 md:p-6`.

**File: `src/components/dashboard/StudentDashboard.tsx`**

1. **Profile tab** (lines 897-1048):
   - Reduce CardHeader padding: use `p-3` on mobile
   - Remove `CardDescription` text ("View and update your personal information" / "Edit your profile details...")
   - Reduce photo section: shrink photo placeholder from `w-24 h-32` to `w-20 h-28`
   - Reduce spacing in form grid from `gap-4` to `gap-2` on mobile
   - Reduce `CardContent` spacing from `space-y-4` to `space-y-3`

2. **Invoices tab** (lines 1051-1116):
   - Remove `CardHeader` with "My Invoices" title and description — the tab already says "Invoices"
   - Reduce invoice item padding from `p-4` to `p-2` on all sizes
   - Tighten spacing between invoice items from `space-y-3` to `space-y-2`

3. **My Classes tab** — handled in `StudentMyClassSchedule.tsx`

**File: `src/components/dashboard/StudentMyClassSchedule.tsx`**
1. Reduce card content padding for empty state from `p-8` to `p-4`
2. Reduce overall spacing from `space-y-4` to `space-y-3`

### Files to modify
- `src/components/layout/ResponsiveLayout.tsx`
- `src/components/dashboard/StudentDashboard.tsx`
- `src/components/dashboard/StudentMyClassSchedule.tsx`

