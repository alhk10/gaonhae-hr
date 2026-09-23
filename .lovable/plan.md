# Pending approvals on the /access Summary tab

Add two new approval queues to the Summary tab on `/access`, alongside the existing
fees / grading / competitions / seminars / guards counts:

1. **New students** — registrations submitted through the public registration form
   that are still waiting to be accepted.
2. **Detail changes** — personal-information change requests raised from `/hello`
   (name, birth date and similar fields that need staff sign-off).

## What staff see

- Two new cards at the top of the Summary tab showing the number waiting, per branch,
  with the same branch locking already used elsewhere (a branch password only ever
  sees its own branch).
- Clicking a count opens a list of the waiting items.
- Each row shows the student's name, branch, submitted date, and the details:
  - New student: name, birth date, gender, contact details, belt.
  - Detail change: the current value next to the requested value, field by field.
- Each row has **Approve** and **Reject** buttons.
  - Approving a new student creates the student record (existing approval behaviour).
  - Approving a detail change writes the requested values onto the student record.
  - Rejecting asks for an optional reason and marks the request rejected.
- Approve/Reject follow the existing `/access` unlock rules: the actions are only
  enabled once the password has been entered, and branch passwords can only act on
  their own branch.

## Technical notes

- `/access` runs anonymously, so the existing direct-table services
  (`studentRegistrationService`, `studentUpdateRequestService`) cannot be reused
  as-is. Add SECURITY DEFINER RPCs with grants to `anon`:
  - `get_public_pending_student_approvals(p_branch_id uuid default null)` —
    returns both queues (kind, id, student/registration details, requested changes,
    branch id/name, submitted at).
  - `approve_public_student_registration(p_id uuid, p_reviewer text)` — mirrors the
    logic in `approveRegistration`: creates the student, marks the registration
    approved.
  - `reject_public_student_registration(p_id uuid, p_reason text, p_reviewer text)`.
  - `approve_public_student_update_request(p_id uuid, p_reviewer text)` — applies
    `requested_changes` to the allowed student columns only (names, certificate name,
    date of birth, gender, contact fields); ignores anything else.
  - `reject_public_student_update_request(p_id uuid, p_reason text, p_reviewer text)`.
  - All write RPCs log to `student_change_logs` where a student is affected.
- Frontend:
  - New `src/services/publicStudentApprovalService.ts` wrapping the RPCs.
  - New `src/components/grading-list/PendingApprovalsSection.tsx` rendering the two
    cards plus the drill-down dialog with Approve/Reject.
  - `SummaryTab.tsx` renders the section and passes `lockedBranchName`; the
    `/access` page passes down whether edit mode (password) is unlocked.
  - Student names use the existing `StudentNameButton` where a student record exists.
- No schema changes: `student_registrations` and `student_update_requests` already
  carry status, reviewer and review-notes columns.
