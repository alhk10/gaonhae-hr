

## Plan: Hide & Highlight Approvals Tab

### Changes to `src/components/dashboard/BranchDashboard.tsx`

**1. Conditionally render the Approvals tab** — only show when `pendingRequests.length > 0`, same pattern as the casual schedule tab.

**2. Highlight the tab** — when visible, apply a distinct style (e.g., `bg-orange-100 text-orange-700 data-[state=active]:bg-orange-500 data-[state=active]:text-white`) to make it stand out from other tabs.

### Scope
Single file, ~5 lines changed around line 388.

