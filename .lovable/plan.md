Root cause found:

1. `get_public_student_term_context` is failing at runtime with:
   `column reference "sessions_total" is ambiguous`
   because the RPC returns a column named `sessions_total` and also queries `entitlements.sessions_total` without table aliases. PostgreSQL treats returned table columns as PL/pgSQL variables, so the query errors and the UI shows “Could not load term right now.”

2. The entitlement fallback resolver is not branch-scoped correctly. It checks the student entitlement branch, but it does not filter `term_calendars.branch_id`, so Kayden in Morley can resolve to another branch’s Term 3.

3. `get_public_student_term_bookings` has another runtime error for entitlement-only students:
   `column sc.student_id does not exist`
   because `student_scheduled_classes` links through `enrollment_id`, not directly through `student_id`.

4. The match/session persistence is now working: recent Kayden sessions have `matched_student_id` saved correctly, so the blocker is inside the RPC SQL, not the frontend session update.

Plan:

1. Create a Supabase migration to fix the public lesson RPCs
- Update `_resolve_public_student_term` so entitlement fallback only returns terms for the student’s actual branch.
- Qualify all entitlement columns in `get_public_student_term_context` with table aliases to remove ambiguity.
- Keep `is_unlimited = true` when the active product name is “Unlimited” or an entitlement is truly unlimited.
- Return Kayden’s Morley Term 3 2026, not another branch’s Term 3.

2. Fix booking lookup for entitlement-only students
- Update `get_public_student_term_bookings` to query scheduled classes through `student_class_enrollments` when an enrollment exists.
- If no enrollment exists, return an empty result safely instead of referencing a non-existent `student_scheduled_classes.student_id` column.

3. Harden related RPCs against the same issue
- Review `get_public_term_slot_capacities` and `get_public_branch_timetable_slots` for returned-column/name conflicts and qualify table columns where needed.
- Keep timetable filtering by branch, age, belt, active entitlement class scopes, and public session validation.

4. Validate with real Kayden data
- Call `_validate_public_chat_session` for Kayden’s latest public chat session.
- Call `_resolve_public_student_term` and confirm it returns Morley Term 3 2026.
- Call `get_public_student_term_context` and confirm it returns a row with `is_unlimited = true`, attended/missed counts, and no SQL error.
- Call bookings/capacity/timetable RPCs and confirm none throw errors.

5. Frontend follow-up only if needed
- The “Remarks (optional)” label and 2-row textarea are already present.
- If the RPC returns correctly but React Query still shows an error, add visible debug-safe error handling around the exact failed RPC and invalidate/refetch after match persistence.