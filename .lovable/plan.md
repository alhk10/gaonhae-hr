

## Revised Plan: Add Branch-Access Tabs to Employee Dashboard

### Overview
When an employee has invoice access (via `useInvoiceAccess`), their Employee Dashboard gets a tabbed layout with 3 tabs: Dashboard, Branch, Students.

The **Students tab** shows a branch-filtered student list; clicking a student renders the full `StudentDashboard` component (same view students see) with `isSimulated=true`, making it read-only.

### Changes to `src/components/dashboard/EmployeeDashboard.tsx`

1. Import `useInvoiceAccess`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, and new `EmployeeBranchStudentList` component
2. Call `useInvoiceAccess()` — if `hasAccess` is true, wrap the entire return in a `Tabs` component
3. If no access, render unchanged

### Tab Structure
```text
[ Dashboard ] [ Branch ] [ Students ]
```

- **Dashboard** — existing Employee Dashboard content (stats, quick actions, dialogs)
- **Branch** — renders `BranchDashboard` filtered to accessible branch(es)
- **Students** — renders `EmployeeBranchStudentList` component

### New Component: `src/components/dashboard/EmployeeBranchStudentList.tsx`

Props: `branchIds: string[]`

Two states:
1. **List view** (default): Fetches students where `branch_id` is in `branchIds`. Displays compact single-line rows (Name, Contact, Email, Belt, Status). Includes search filter. Clicking a row transitions to detail view.
2. **Detail view**: Renders `StudentDashboard` with `studentId={selectedStudentId}` and `isSimulated={true}`. Shows a "Back to list" button above it. This gives the exact same dashboard view that students see — overview, invoices, entitlements, class schedule, profile — but in simulated/read-only mode.

### Data Flow
- `useInvoiceAccess()` → `accessibleBranches` with `branch_id` values
- Branch tab: passes first `branch_id` to `BranchDashboard`
- Students tab: passes all accessible `branch_id` values to `EmployeeBranchStudentList`
- Student detail: passes selected `studentId` to existing `StudentDashboard` component

