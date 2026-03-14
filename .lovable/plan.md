

## Problem

The "Add Student/Trial" dropdown in `BranchDashboard` navigates to `/parties?tab=students&action=add`, which:
1. Opens the Party Management page (users may lack superadmin access to see it)
2. The Party Management page doesn't even read the URL params to open the dialog

## Solution

Open the `AddStudentDialog` and `AddTrialDialog` directly within `BranchDashboard` instead of navigating away.

**File: `src/components/dashboard/BranchDashboard.tsx`**

1. Import `AddStudentDialog` and `AddTrialDialog`
2. Add two state variables: `showAddStudentDialog` and `showAddTrialDialog`
3. Replace the `navigate('/parties?...')` calls in the dropdown items with `setState(true)` calls
4. Render both dialogs at the bottom of the component with `onStudentAdded`/`onTrialAdded` callbacks that refresh the students query

**Changes summary:**
- Lines ~704-708: Replace `navigate` calls with local state toggles
- Add state declarations and dialog renders
- Add query invalidation on student/trial added via `queryClient`
- No other files or functionality affected

