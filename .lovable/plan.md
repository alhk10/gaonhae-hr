## Problem

Approving Emily Hana's `/hello` booking fails with **"No active enrollment found for this student in this term"**.

Root cause: `approveLessonRequestBooking` in `src/services/chatLessonRequestService.ts` requires a row in `student_class_enrollments` (because `student_scheduled_classes.enrollment_id` FKs to it). Emily has a paid/verified invoice for Term 2 2026 with a lesson item and an auto-created entitlement (10 sessions), but no `student_class_enrollments` row — that row is only created when the invoice UI collects class slots at invoice time. Since her lessons were left "to be booked later", the enrollment was never inserted.

## Fix

In `chatLessonRequestService.ts` → `resolveEnrollment`, if no active enrollment exists for the student/branch/term, auto-create one from the matching paid lesson invoice item instead of throwing.

### Steps (single file: `src/services/chatLessonRequestService.ts`)

1. Keep existing lookup for an active enrollment.
2. If none found:
   - Locate the term covering the booking date (already computed).
   - Find a lesson `invoice_items` row for this student/branch where `metadata->>'term_id' = <termId>` and its `invoices.status` is one of `paid`, `verified`, `partially_paid`, `sent`, `draft` (i.e. not `cancelled`). Pick the most recent.
   - Resolve `class_type` from the booking's `timetable_id` via `branch_timetables.class_type` (fallback: product name).
   - Resolve `pricing_tier_id` / `tier_name` / `total_price` from the invoice item's `product_id` via `class_pricing_tiers` for that branch + class_type (fallback: `tier_name = 'Custom'`, `total_price = invoice_item.total_amount`).
   - Call the existing `createEnrollment(...)` helper from `classEnrollmentService.ts` with `invoice_item_id` linked, `notes: 'Auto-created from /hello lesson approval'`, and use the returned id.
3. If still no invoice item is found, throw a clearer error: `"No paid lesson invoice found for this term — cannot create enrollment"`.

No UI changes. No migration. No other services touched.

## Verification

- Reopen the Wednesday 4 PM Junior slot dialog for Emily Hana, click **Approve** — the toast should succeed, the pending row disappears, and a new row appears under Attendance for that slot.
- Confirm a `student_class_enrollments` row now exists for Emily (Term 2 2026, Morley) and a `student_scheduled_classes` row for 2026-07-01 16:00 links to it.

## Out of scope

- Backfilling enrollments for other students.
- Changing entitlement counting or the invoice auto-enrollment flow.
- Any UI copy or layout changes.
