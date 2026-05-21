## Scope

Two additions to `src/pages/public/PublicHelloChat.tsx`:
1. A **Back** button that returns one step in the chat flow.
2. A **Schedule / Reschedule a lesson** option on the matched-student screen that submits a staff-approved request (no direct attendance writes from the public page).

No changes outside the public Hello chat for the back button. Schedule/reschedule reuses the existing callback submission path and adds a new request type plus a small staff-side surface so the request flows into approvals → attendance once accepted.

---

## 1. Back button (history stack)

- Maintain a `stageHistory: Stage[]` ref/state inside `PublicHelloChat`. Every time we transition to a new stage, push the current stage onto the stack.
- Replace direct `setStage(...)` calls with a `goTo(next)` helper that does the push + transition.
- Add a `goBack()` helper that pops the stack and sets stage to the popped value. If stack is empty, hide the button.
- Render a small **Back** button (chevron-left icon, `variant="ghost"`, `size="sm"`) in the sticky header, on the left side, visible whenever `stageHistory.length > 0` and the current stage is not a terminal `*_done` state.
- The existing inline Back buttons on `payment_products` and `payment_pay` keep working (they will simply call `goBack()`).
- Do not clear cart, identify fields, or matched student on back — the user can resume forward.

## 2. Schedule / Reschedule a lesson (matched students only, request-based)

### UI flow (new stages)

Add to the `Stage` union:
- `lesson_action` — choose "Schedule a new lesson" or "Reschedule an existing lesson".
- `lesson_reschedule_pick` — list the matched student's upcoming scheduled classes (read via a new public RPC) so they can pick the one to reschedule.
- `lesson_request` — capture preferred date, preferred time / weekday + slot, optional reason/notes.
- `lesson_request_done` — confirmation bubble.

On the existing `matched` screen, add a second button next to "Make a payment":
- **Schedule / Reschedule a lesson** → `lesson_action`.

`lesson_action` shows two buttons:
- **Schedule a new lesson** → `lesson_request` with `mode = 'schedule'`.
- **Reschedule an existing lesson** → `lesson_reschedule_pick`.

`lesson_reschedule_pick` lists the student's upcoming `student_scheduled_classes` (date, time, class type) via a new SECURITY DEFINER RPC `get_public_student_upcoming_classes(p_student_id uuid)` that returns only future, non-cancelled rows for the matched student id. Selecting one stores it on local state and advances to `lesson_request` with `mode = 'reschedule'`.

`lesson_request` form:
- Preferred date (`Input type="date"` is forbidden by project memory → use 3-select DD/MM/YYYY like the identify step, restricted to today..+60 days).
- Preferred time (free text, e.g. "Tue 5–6pm", placeholder helps).
- Optional notes (`Textarea`, 500 char cap).
- Submit → calls `submitLessonRequest(...)` and advances to `lesson_request_done`.

`lesson_request_done` confirms with a green tick and tells the student staff will confirm by email/phone.

### Service / data

Add to `src/services/publicChatService.ts`:
- `getStudentUpcomingClasses(studentId)` — calls the new RPC, returns `{ id, scheduled_date, start_time, end_time, class_type }[]`.
- `submitLessonRequest(args)` — inserts into a new `lesson_schedule_requests` table (anon-insert allowed, matched-student id captured server-side via a SECURITY DEFINER RPC `submit_lesson_request(...)` to avoid trusting client-supplied student id without identity match — pattern mirrors the existing chat payment / callback flow).

### Database (single migration)

- New table `lesson_schedule_requests`:
  - `id`, `session_id` (fk → `public_chat_sessions`), `student_id` (fk → `students`), `branch_id`, `mode` (`'schedule' | 'reschedule'`), `existing_scheduled_class_id` (nullable fk), `preferred_date` (date), `preferred_time` (text), `notes` (text), `status` (`'pending' | 'approved' | 'rejected'` default `pending`), `reviewed_by`, `reviewed_at`, `created_at`.
  - RLS: anon `INSERT` only via the SECURITY DEFINER RPC; authenticated staff `SELECT`/`UPDATE` via existing branch-scoped policy pattern (reuse `has_role` + branch access helpers used by other request tables such as `student_update_requests`).
- New RPC `get_public_student_upcoming_classes(p_student_id uuid)` returning future, non-cancelled rows from `student_scheduled_classes` joined to enrollment/class type. SECURITY DEFINER; no auth required (mirrors `get_public_grading_slots`).
- New RPC `submit_lesson_request(...)` inserting a row, SECURITY DEFINER, validates branch + student exist.

### Staff-side surface (so requests flow into attendance)

- Add `lesson_schedule_requests` (pending) to the existing Approvals tab on the Branch Dashboard (`src/components/dashboard/...` approvals section) as a new row type:
  - Shows student name, mode, existing class (if reschedule), preferred date/time, notes.
  - Approve / Reject buttons. Approve flips status to `approved`; staff then perform the actual booking in the existing Slot Booking / class schedule UI (no automatic mutation of `student_scheduled_classes` to avoid bad data).
  - Reject sets status `rejected`.
- This matches the existing "Request-based, staff approves" pattern memorised under `mem://features/branch-dashboard/approvals-management` and avoids any RLS/identity-spoofing risk from the anonymous public page.

---

## Technical notes

- Stage transitions in `PublicHelloChat.tsx` are currently scattered (`setStage('...')`) — wrap them all in `goTo` so the back stack stays accurate. The change is mechanical but touches ~10 call sites.
- Date entry uses the existing three-`Select` DD/MM/YYYY pattern already present in the identify step; native `<input type="date">` is forbidden by project convention (`mem://design/date-format`).
- Reuse `Bubble`, `Card`, `Button`, `Select`, `Textarea`, and the existing `logChatEvent` calls for new events: `lesson_action_opened`, `lesson_reschedule_picked`, `lesson_request_submitted`.
- The schedule/reschedule entry point is gated behind `stage === 'matched' && !!matched` only. Not shown on the `choice` (no-match) screen per your answer.

## Files touched

- `src/pages/public/PublicHelloChat.tsx` — back button, stage stack, new stages and UI.
- `src/services/publicChatService.ts` — new `getStudentUpcomingClasses` and `submitLessonRequest`.
- `src/components/dashboard/...` (existing approvals component) — new request type row, approve/reject handlers.
- Supabase migration — new `lesson_schedule_requests` table + RLS + two RPCs.

## Out of scope

- Direct mutation of `student_scheduled_classes` from the public page.
- Any change to existing student-portal `StudentMyClassSchedule` self-service flow.
