# Ready for Grading badge (Attendance) + /hello grading gating

## What staff will see (/access Attendance)
- Next to each student's payment badge (e.g. "No invoice"), a small **Ready for grading** checkbox badge.
- Unticked: outlined grey "Ready for grading" with empty box. Ticked: amber "Ready for grading" with tick.
- Once the student has paid for grading (paid/verified grading invoice, or verified grading payment), the badge turns green **Grading paid** and can no longer be unticked.
- Ticking applies to the current term (the term of the day being viewed). Trial and employee students also get the badge.

## What students will see (/hello after sign-in/recognition)
- **Grading** option in the payment menu only appears when staff have ticked "Ready for grading" for that student this term (or already paid — then shows as paid, not payable again).
- Not ticked: Grading option hidden.

## Technical details
- Reuse existing `grading_registrations.ready_for_grading` (per student + term) as the single source, so branch dashboard, grading list and /access agree.
- New password-gated RPC `access_set_ready_for_grading(p_password, p_student_id, p_term_id, p_ready)`: checks branch scope via `_access_scope`/`_scope_has`, upserts the registration row (creates one with null slot if missing), refuses unticking when grading is paid.
- Extend `access_attendance_week` to return `ready_for_grading` and `grading_paid` per booking student for the term.
- New public RPC `hello_grading_eligibility(session, student_id)` (validated via existing chat session check) returning `{ready, paid}`; `PublicHelloChat.tsx` filters the Grading category (`GRADING_CATEGORY_ID`) out of the menu when not ready.
- Attendance UI: new `GradingReadyBadge` beside `StatusBadge`; optimistic toggle with toast on error.
- Add a small test for the badge-state helper (not ready / ready / paid).
