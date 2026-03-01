

## Plan: Invoices Created Section on Superadmin Dashboard

### What
Add a compact "Invoices Created" section to the Superadmin Dashboard overview tab. It shows a table of invoices filterable by time period (this week / this month) and branch, with columns: Student Name, Amount, Amount Due, Status.

### Changes

#### 1. New component: `src/components/dashboard/InvoicesCreatedSection.tsx`
- Filter controls: period toggle (This Week / This Month) + branch dropdown (using `useBranches` hook)
- Query `invoices` table joined with `students` for name, filtered by `created_at` range and optionally `branch_id`
- Compact table with columns: Student Name, Amount (`total_amount`), Amount Due (`balance_due`), Status (badge)
- Use existing `Table` UI components and `Badge` for status

#### 2. Update `src/components/dashboard/SuperadminDashboard.tsx`
- Import and render `InvoicesCreatedSection` in the overview tab (above or below the slot booking calendar)

### No database changes needed — reads existing `invoices` table with `students` join.

