# Plan their lessons before paying (/hello school fees)

## What changes for the student

On the School Fees step, once a class and a term plan (4 weeks or full term) are picked, two buttons appear:

- **Add / confirm schedule** — opens a calendar so the student can pick their lesson days now.
- **Skip to payment** — the current "Continue" button, renamed.

The calendar behaves like the existing "Schedule / reschedule a lesson" screen: only class times that suit the student's age and belt, class full markers, no public holidays, no past dates, limited to the chosen term's dates. The number of lessons they may pick equals their plan: 4 weeks × lessons-per-week, or the whole term × lessons-per-week.

After confirming, the payment screen lists the chosen dates so they can check them before uploading proof. They can go back and change the picks.

## What staff see

When the payment is submitted, the chosen lessons are saved as real lessons for that student, but flagged as awaiting payment. On the branch dashboard they appear in the class lists and timetable with an **Unpaid** badge until the branch verifies the payment; once verified the badge disappears. If the branch rejects the payment, those lessons are cancelled automatically.

Skipping the schedule keeps today's behaviour — nothing is booked and staff can schedule later.

## Technical notes

- `PublicHelloChat.tsx`: add a `fees_schedule` stage reusing the existing calendar/slot picker components and helpers (`slotsForDate`, capacity/holiday maps) but driven by the fee-step selection instead of an existing enrollment. Keep picks in state, carry them into `submitChatPayment`.
- New read RPC (security definer, session-validated) that returns eligible timetable slots, per-date booked counts and holidays for a **chosen term + product** without requiring an existing enrollment — the current `get_public_student_term_context` / `get_public_term_slot_capacities` path assumes an invoiced term.
- Extend `submit_public_chat_invoice` with a `p_planned_slots jsonb` argument: after creating the invoice, create (or reuse) the student's `student_class_enrollments` row for that term/branch and insert `student_scheduled_classes` rows for the picked dates, tagged in `notes` as pending payment verification, with a re-check of capacity at insert time.
- Verification path: when the chat payment is verified the tag is cleared; when rejected/deleted the tagged lessons are set to `cancelled` (folded into the existing chat-submission verify/reject handling).
- Branch dashboard (`BranchDashboard`, `StudentClassSchedule`, `BranchWeeklyTimetable`, attendance list): show an amber "Unpaid" badge for lessons still carrying the pending-verification tag.
- Lesson count cap enforced both in the UI and inside the RPC.

## Verification

- Pick a class with the 4-week plan, confirm 4 lessons, submit payment: lessons appear on the branch dashboard marked Unpaid.
- Verify the payment on the branch dashboard: badge clears.
- Reject the payment: lessons are cancelled.
- Use "Skip to payment": nothing is booked, payment flow unchanged.
