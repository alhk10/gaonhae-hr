

# Revamped Grading List -- Both Sales and Branch Dashboard

## Overview
Update both `GradingListTab.tsx` (Sales, with branch filter) and `BranchGradingList.tsx` (Branch Dashboard, pre-filtered by branch) to show identical table columns with the new enriched data. Both components will share the same column layout, data fetching logic, and actions.

## New Column Layout (identical in both components)

| # | Column | Source | Notes |
|---|--------|--------|-------|
| 1 | Student Name | `students.first_name + last_name` | Link to student profile |
| 2 | Current Belt | `students.current_belt` | Badge |
| 3 | Lessons Attended | `class_attendance` count | Count of "present" records within term date range and branch |
| 4 | Ready for Grading | `grading_registrations.ready_for_grading` | Checkbox |
| 5 | Grading Paid | Grading invoice lookup via `grading_registrations.invoice_item_id` | Badge: Paid / Unpaid / N/A |
| 6 | Grading Slot | `grading_registrations.grading_slot_id` joined to `grading_slots` | Slot title + date, or "Not Assigned" |
| 7 | Result | `grading_registrations.result` | Dropdown: Pass, Double, Confirmed, Fail |
| 8 | Certificate | Conditional on result (Pass/Confirmed) | View button |
| 9 | Certificate II | Conditional on result (Double) | View button |
| 10 | Actions | Edit / Delete buttons | Edit opens editor; Delete with confirmation |

## Columns Removed (from current layout)
- "Class Invoice" (replaced by Lessons Attended)
- "New Current Belt" (removed to save space; result implies it)

## Filter Differences

- **GradingListTab.tsx (Sales)**: Branch selector dropdown + Term selector + only active students with paid term invoices (remove the all/paid/unpaid payment filter -- show only paid)
- **BranchGradingList.tsx (Branch Dashboard)**: Branch is pre-set via `branchId` prop (no branch selector) + Term selector + only active students with paid term invoices (remove payment filter)

## Data Fetching Changes (applied to both components)

### 1. Only Active Students with Paid Term Invoice
- Add `.eq('status', 'Active')` filter on the students query
- Hardcode `invoice_status === 'paid'` filter (remove the payment filter dropdown)

### 2. Lessons Attended Count (new)
- After getting student IDs, batch-query `class_attendance`
- Filter: `student_id` in list, `status = 'present'`, `class_date` between term `start_date` and `end_date`, `branch_id` matches
- Group by `student_id` and count

### 3. Grading Paid Status (new)
- For students with a `grading_registration` that has an `invoice_item_id`, look up the parent invoice's status via `invoice_items.invoice_id` -> `invoices.status`
- Display as Paid / Unpaid / N/A (if no registration or no invoice_item_id)

### 4. Grading Slot Info (new)
- For students with a `grading_registration` that has a `grading_slot_id`, join to `grading_slots` to get `title` and `grading_date`
- Display as "Title - dd MMM yyyy" or "Not Assigned"

### 5. Edit and Delete Actions (new)
- **Delete**: Confirmation dialog, then call `removeGradingRegistration` from `gradingService.ts`, invalidate cache
- **Edit**: Inline editing (result dropdown already exists); add an edit button that could open a dialog for slot assignment and notes

## Updated Interface

```typescript
interface GradingListStudent {
  student_id: string;
  student_name: string;
  current_belt: string | null;
  invoice_status: string;
  invoice_id: string;
  ready_for_grading: boolean;
  result: 'pass' | 'fail' | 'double' | 'confirmed' | null;
  certificate_issued: boolean;
  certificate_ii_issued: boolean;
  registration_id: string | null;
  lessons_attended: number;
  grading_paid: 'paid' | 'unpaid' | 'n/a';
  grading_slot_title: string | null;
  grading_slot_date: string | null;
}
```

## Files Modified
- `src/components/sales/GradingListTab.tsx` -- update query, remove payment filter dropdown, add new columns, add edit/delete actions
- `src/components/dashboard/BranchGradingList.tsx` -- identical table and query changes, remove payment filter dropdown, branch comes from prop

No database schema changes needed.

