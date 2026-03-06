

## Plan: Add Grading Paid Count to Grading Tab Metric

### Current Behavior
The Grading tab shows `Grading ({gradingListCount})` where `gradingListCount` is the total number of unique students with lesson-type invoices for the current term.

### Desired Behavior
Show how many students have paid for their grading test, e.g. `Grading (3/10)` — 3 paid out of 10 total.

### Changes

#### 1. Update metric query in `src/components/dashboard/BranchDashboard.tsx`

**Lines 225-265**: Modify the `grading-list-count` query to also count students with paid grading invoices. The logic:
- Query `grading_registrations` that have an `invoice_item_id`
- Join to `invoice_items` → `invoices` to check if the invoice status is `'paid'`
- Filter by current term and branch
- Return `{ total: number, gradingPaid: number }` instead of just a number

**Line 386**: Update the tab label from `Grading ({gradingListCount})` to `Grading ({gradingPaidCount}/{gradingListCount})` showing paid vs total.

### Scope
- One file: `src/components/dashboard/BranchDashboard.tsx`
- No database changes

