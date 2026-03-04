

## Plan: Collapsible Sidebar on All Screen Sizes for Superadmin

**Problem**: The sidebar is always visible on desktop for superadmin, taking up space. It should be hidden behind a menu button on both mobile and desktop.

### Changes

**File**: `src/components/layout/Sidebar.tsx`

1. **Remove the `isMobile` branching** (lines 301-365) — unify mobile and desktop into one toggle-based sidebar
2. **Replace the desktop permanent sidebar** (lines 345-365) with the same overlay/toggle pattern currently used for mobile
3. **Remove `md:hidden`** from the menu button (line 309) and overlay (line 317) so they work on all screen sizes
4. **Position the menu button** in the Navbar area (top-left) consistently across all viewports

**File**: `src/components/layout/ResponsiveLayout.tsx`

No changes needed — it already conditionally renders `<Sidebar />` for superadmins. The sidebar component itself will handle the toggle behavior internally.

### Result
- Superadmin sees a hamburger menu button (top-left) on all screen sizes
- Clicking it opens a slide-out sidebar overlay
- Clicking outside or pressing X closes it
- No permanent sidebar consuming horizontal space on desktop

