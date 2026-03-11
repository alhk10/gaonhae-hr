

## Investigation: ABBY CHAN appearing on Yishun timetable after invoice deletion

### Root Cause

The `deleteInvoice` function in `src/services/invoiceService.ts` (line 625-629) **nullifies** `class_attendance.entitlement_id` but does **not delete** the `class_attendance` records themselves. This means:

1. Invoice deleted → entitlements deleted → scheduled classes deleted → enrollments deleted ✓
2. But `class_attendance` records remain with `entitlement_id = null` ✗

The Weekly Timetable (`BranchWeeklyTimetable.tsx`, lines 154-168) merges attendance-based students into the display via `getAttendanceForWeek`, which queries `class_attendance` by branch + date range. Since ABBY CHAN's attendance records persist, she still appears on the timetable.

### Fix

**File: `src/services/invoiceService.ts`** — In `deleteInvoice`, after nullifying `class_attendance.entitlement_id`, also **hard-delete** those attendance records. Additionally, get the `student_id` from the invoice and delete any `class_attendance` records for that student at that branch that were created via the enrollment/entitlement system.

Specifically, change the logic at lines 625-629 from:
- Nullify `class_attendance.entitlement_id` → keep records

To:
- **Delete** `class_attendance` records where `entitlement_id` matches the deleted entitlements (these are system-generated attendance records tied to the invoice)
- Also query the invoice's `student_id` and `branch_id`, then delete any remaining `class_attendance` records for that student+branch where `attendance_method = 'auto_scheduled'` (to catch records that may not have had an entitlement link)

This ensures that when an invoice is fully deleted, all traces of the student's scheduled attendance are removed from the timetable.

### Scope of Changes

- **`src/services/invoiceService.ts`**: Modify `deleteInvoice` to hard-delete `class_attendance` records linked to deleted entitlements, and clean up auto-scheduled attendance for the student

