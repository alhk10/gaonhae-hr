## Goal

Make /hello lesson schedule requests (like Emily Hana's Morley booking) visible on the Branch Dashboard Approvals area **and inside the Weekly Timetable slot dialog for each requested timeslot**, and let approving actually book (and cancel) the requested lessons in one click.

## Background

The row exists in `public_chat_callback_requests` (id `d3f5c206…`, branch Morley, type `lesson_schedule_request`, status `new`, `matched_student_id = NULL`). It currently only surfaces on the Superadmin Dashboard's "Public Hello Chat — Unmatched" card, which just sets `matched_student_id` and never touches `student_scheduled_classes`.

## Changes

### 1. Persist student link when the /hello request is submitted

`src/services/publicChatService.ts` → `submitLessonRequest`:
- After `submitCallback` returns the new callback id, update the row with `matched_student_id = input.student_id`. Message text stays as-is.

### 2. New service: `src/services/chatLessonRequestService.ts`

Shared helper used by every approval surface below.

- `listPendingLessonRequests(branchId?)`: `public_chat_callback_requests` where `type = 'lesson_schedule_request'` AND `status IN ('new','matched')` AND `matched_student_id IS NOT NULL`, optionally filtered by branch. Returns rows plus a parsed `{ cancellations: [{scheduled_class_id}], new_bookings: [{date,start_time,end_time,class_type,timetable_id}] }` derived from the `message` (regex on the existing `Cancel:` / `Book:` blocks).
- `listPendingLessonRequestsForSlot(branchId, date, start_time, end_time, timetable_id?)`: same base query, then filters the parsed `new_bookings` to only those matching the slot. Used by the Weekly Timetable slot dialog.
- `getPendingLessonRequestCount(branchId?)`: `head:true` count with the same base filter.
- `approveLessonRequest(row, parsed)`:
  1. For each `cancellations[].scheduled_class_id` → `update student_scheduled_classes set status='cancelled'`.
  2. For each `new_bookings[]` → look up the student's active enrollment for that branch/term. Insert `student_scheduled_classes(enrollment_id, timetable_id, scheduled_date, start_time, end_time, status='scheduled')`.
  3. Set callback `status='approved'`.
- `approveLessonRequestBooking(row, booking)`: variant that approves only one `new_bookings[]` entry (used from the slot dialog); marks the callback `status='approved'` only once every parsed booking has been inserted/cancelled, otherwise leaves status as-is with an internal flag on the row's `message`/`notes` metadata (or a new `handled_booking_ids` JSON column — see Technical below).
- `rejectLessonRequest(id, reason)`: `status='rejected'`, `rejected_at=now()`, `rejected_reason=reason`.

### 3. Branch + Superadmin Dashboard approval card

New `src/components/dashboard/PublicHelloLessonRequestApprovals.tsx` (`branchId?`).
- One card per pending request: student name, branch, submitted timestamp, parsed Cancel/Book lists (DD/MM/YYYY HH:MM–HH:MM (class type)).
- Actions: `Approve & Book` (calls `approveLessonRequest`), `Reject`.

Wire-up:
- `BranchDashboard.tsx`: add `pendingLessonReqCount` query, include in `hasApprovals` and the Approvals-tab badge (line 1117 / 1363), render the card near line 1846, add `public_chat_callback_requests` to the realtime invalidation block.
- `SuperadminDashboard.tsx`: render the new card next to `PublicHelloCallbackApprovals` (line 210).
- `chatCallbackApprovalService.listUnmatchedChatCallbacks`: exclude `type='lesson_schedule_request'` so lesson requests never appear in the generic Unmatched card.

### 4. Inline approval inside the Weekly Timetable slot dialog

`src/components/dashboard/SlotAttendanceDialog.tsx` (the "Kids · Wed, Jul 1, 2026 · 5:00 PM" dialog in the screenshot):
- Add a `useQuery` calling `listPendingLessonRequestsForSlot(branchId, scheduled_date, start_time, end_time, timetable_id)`.
- Above the `Attendance (n) / Add Students (n)` tabs, render a compact amber "Pending /hello bookings (n)" section listing each pending student with:
  - Student name + submitted timestamp.
  - `Approve & Add` → calls `approveLessonRequestBooking` for that booking only, then invalidates the slot's attendance/`Add Students` queries so the student immediately appears under Attendance.
  - `Reject` → `rejectLessonRequest` with an inline reason input.
- Section auto-hides when there are no pending bookings for the slot.

### 5. Backfill Emily Hana's existing row

One-time update: set `matched_student_id = d4409ba0-4229-4235-a772-19a75bb11c45` on callback `d3f5c206-4598-4300-b585-7c4ccd7fc31d` so the new UI surfaces it immediately.

## Technical

Per-booking approval needs to know which entries in a multi-booking request have already been handled. Add a nullable `handled_booking_keys text[]` column to `public_chat_callback_requests` (key format `YYYY-MM-DD|HH:MM|HH:MM|timetable_id`). `approveLessonRequestBooking` appends the key; `listPendingLessonRequests*` filters out keys that are already present. Callback `status` flips to `approved` when every parsed `new_bookings[]` key is handled (cancellations count as handled immediately on first approve, or handled together with the first per-booking approve).

Migration:
- `ALTER TABLE public.public_chat_callback_requests ADD COLUMN IF NOT EXISTS handled_booking_keys text[] NOT NULL DEFAULT '{}';`
- No new tables, no grant/RLS changes.

## Out of scope

- Editing requested slots inside the approval UI (approver approves as-is or rejects).
- Notifications / emails on approval.
- Changing how entitlements or enrollments are computed — new rows use existing `student_scheduled_classes` semantics.
- Any change to `PublicHelloChat.tsx` request-building code beyond writing `matched_student_id`.
