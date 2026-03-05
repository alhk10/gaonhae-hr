

## Plan: Prefill Package and Class Timeslots from Previous Invoice

### Problem
When a student opens "Pay School Fees" for a new term, neither the package (product) nor the class timeslots are prefilled. The `previousEnrollment` prop is null (no enrollment records exist for this student), so the existing auto-fill at line 322-331 does nothing. The user expects both fields to carry forward from the most recent invoice.

### Root Cause
- The auto-fill logic depends on `previousEnrollment` from `student_class_enrollments`, which is empty for this student
- No fallback exists to read from the previous invoice's `invoice_items.metadata` which stores `product_name` and `selected_class_slots`

### Solution

**File: `src/components/dashboard/PaySchoolFeesDialog.tsx`**

1. **Add a query to fetch the most recent invoice item metadata** for this student where the item has a `term_id` in metadata (i.e., it's a class/term invoice item):
   - Query `invoice_items` joined with `invoices` filtered by `student_id`, status in `['paid', 'draft', 'verified']`, ordered by `created_at desc`
   - Select `metadata` (which contains `product_name`, `selected_class_slots`, `term_id`)
   - Limit 1

2. **Prefill package from previous invoice metadata**: In the existing `useEffect` (line 322-331), add a fallback that checks `previousInvoiceMetadata.product_name` when `previousEnrollment` is null or has no match. Match it against `classProducts` by name.

3. **Prefill class timeslots**: Add a new `useEffect` that triggers when `selectedTermId` changes and previous slot data is available:
   - Extract unique timetable IDs from previous `selected_class_slots` (format: `timetableId_YYYY-MM-DD`)
   - For each timetable ID, look up its weekday from `branch_timetables`
   - Generate new slot strings for those same weekdays within the new term's date range (excluding breaks/holidays)
   - Set `selectedClassSlots` to these generated strings
   - Only auto-fill if `selectedClassSlots` is currently empty (don't override manual selection)

### Files to modify
- **Edit**: `src/components/dashboard/PaySchoolFeesDialog.tsx` -- Add previous invoice query, prefill package fallback, and class slot auto-fill logic

