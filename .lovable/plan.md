Plan to fix `/hello` term loading thoroughly:

1. Fix the immediate session validation blocker
- After a student is matched in `/hello`, save `matched_student_id` onto `public_chat_sessions` immediately.
- The lesson RPCs currently validate `public_chat_sessions.matched_student_id`; because it remains `null`, term/calendar calls can return no data even after a successful match.

2. Make term context load for Kayden/unlimited entitlement cases
- Update `get_public_student_term_context` so it does not depend only on `student_class_enrollments`.
- Keep the existing enrollment-first behavior.
- Add a fallback that derives the relevant term from active entitlements when no active enrollment exists, matching entitlement `valid_from` / `valid_to` against `term_calendars`.
- Return `is_unlimited = true` when an active entitlement/product is unlimited, so Kayden and similar students show `∞`.

3. Keep calendar dependencies consistent
- Update `get_public_student_term_bookings` to return an empty list instead of blocking the calendar when no enrollment exists.
- Update `get_public_term_slot_capacities` to use the same resolved term range fallback, so open class capacity can still load for entitlement-only students.
- Keep timetable filtering based on age, belt, branch, and entitlement class scopes.

4. Improve loading/error feedback
- In `/hello`, distinguish between:
  - still loading term,
  - no active/current term found,
  - failed term load.
- Avoid showing an endless “Loading term…” card when the RPC returns no term.

5. Update the lesson request remarks field
- Change label from `Notes (optional)` to `Remarks (optional)`.
- Keep the textarea at 2 rows visually by overriding the shared textarea minimum height for this field.
- Keep placeholder and submit behavior unchanged unless you want different wording later.

Technical details:
- Files to update after approval:
  - `src/pages/public/PublicHelloChat.tsx`
  - `src/services/publicChatService.ts`
  - Supabase migration for the public lesson RPCs
- No new tables.
- No change to `/pay`.