

## Problem

The "Add Student" and "Add Trial" buttons in BranchDashboard navigate to `/parties?tab=students&action=add` or `/parties?tab=trials&action=add`. However, `PartyManagement.tsx` never reads URL query parameters — it always initializes with default state (`activeTab='students'`, dialogs closed). The query params are ignored.

## Fix

**File: `src/pages/PartyManagement.tsx`**

Add a `useEffect` that runs once on mount to read `tab` and `action` from `window.location.search`:

- If `tab` is `students` or `trials`, set `activeTab` accordingly
- If `action` is `add`, open the corresponding dialog (`showAddStudentDialog` or `showAddTrialDialog`)
- Clean URL params afterward with `window.history.replaceState` to prevent re-triggering on refresh

This is a ~15-line addition with no changes to any other file or existing functionality.

