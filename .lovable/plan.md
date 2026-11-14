# Warn staff when ticking "Ready for grading" for a student with unpaid term fees

## The problem
Aari Sanjiv is ticked Ready for Term 4 2026, but she has no paid class fees this term. /hello therefore hides the grading button, and staff got no warning when they ticked her.

## What changes
1. **Warning when staff tick Ready** (in the /access Grading tab and the branch dashboard): before the tick saves, the app checks the student's paid weeks for the term. If they are below the grading rule (half the term, or any weeks for late joiners), a box opens:
   - "Term 4 2026 has not been paid (0 of 12 weeks paid). The grading button will not show in /hello until fees are paid."
   - **Cancel**: leave the student unticked.
   - **Mark ready, fees unpaid**: tick anyway.
   - **Override and allow grading**: tick and also let the student see the grading button in /hello now.
2. **Saved override**: the override is stored on the student's grading entry for that term. /hello grading checks respect it. The grading list shows an "Override" badge, and unticking Ready removes the override.
3. **Aari**: once this is built, staff can untick and re-tick her to choose. Nothing about her record changes automatically.

## Technical details
- Add `fee_override boolean default false` to `grading_registrations`.
- Add an RPC `access_grading_term_fee_status(p_password, p_student_id, p_term_id)` that wraps `_term_coverage`. It returns paid_weeks, term_weeks and grading_eligible, and is guarded by the staff password scope.
- Extend `access_set_ready_for_grading` with an optional `p_fee_override` argument. It clears the override when ready becomes false.
- `hello_grading_eligibility`: `term_eligible` also becomes true when the ready registration has `fee_override`.
- Add the dialog to `BranchGradingList.tsx` `toggleReadyMutation` (both the desktop and mobile checkboxes).
- Add a test in `src/utils/gradingReady` that checks the override shows grading.
