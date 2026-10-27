# Lock branch in Add Student to the /access login password

When staff open **Add Student** or **Add Trial Student** in `/access` with a branch password, the Branch field is filled in with that password's branch and can't be changed.

## Behaviour
- **Single-branch password** (for example Kembangan): Branch is preset to that branch and the dropdown is disabled.
- **Multi-branch password** (for example Bukit Merah + Carpe Diem Stradia): Branch is preset to the branch currently selected in the switcher. The dropdown lists only the branches that password covers.
- **All-branch password** (Hp97533488): no change. Any branch can be picked.
- This applies to both the Add Student and Add Trial Student buttons.

## Technical details
- `StudentsTab` already receives `lockedBranchId`. Pass it, plus the password's allowed branch IDs from `PublicGradingList`, into `AddStudentDialog`.
- `AddStudentDialog`: add optional `lockedBranchId` and `allowedBranchIds` props. Set `branchId` from `lockedBranchId` on open and again after reset. Filter branch options to `allowedBranchIds` when provided. Disable the Select when only one branch is allowed.
- This is a screen-level lock only. The current create-student database function does not check password scope, so the restriction can still be bypassed outside the app. Enforcing it in the database would need a separate change.
