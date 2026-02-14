

## Default Filter: Show All Unpaid Invoices

### Overview
Change the Invoice & Payment tab to default to showing all unpaid invoices (instead of the last 20 from all statuses), and show all related payments without the 20-item slice limit.

### Changes

**File: `src/components/dashboard/BranchDashboard.tsx`**

1. **Invoice query** (line ~121-126): Add a filter to only fetch unpaid invoices by default -- filter for statuses `draft`, `sent`, `unpaid`, `partial`, `overdue` using `.in('status', [...])`. Remove the `.limit(50)` so all unpaid invoices are returned.

2. **Invoice display** (line ~597): Remove `.slice(0, 20)` so all fetched invoices are shown.

3. **Payment display** (line ~635): Remove `.slice(0, 20)` so all fetched payments are shown.

4. **Payment query** (line ~136-142): Remove `.limit(50)` to allow all payments to load.

### Technical Notes
- The invoice query will use `.in('status', ['draft', 'sent', 'unpaid', 'partial', 'overdue'])` to fetch only unpaid invoices by default
- Both `.slice(0, 20)` caps on display will be removed
- Both `.limit(50)` caps on queries will be removed
- The query key will be updated to reflect the filter so cache works correctly

