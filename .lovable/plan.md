# Branch passwords for /access

Five new passwords open /access locked to one branch. Everything a person can do today with the standard password stays available — verify, edit, match, refund requests — but every list, count and dropdown only ever shows that branch.

| Password | Branch |
| --- | --- |
| Hp96706488 | Balmoral |
| Hp89234866 | Bukit Merah |
| Hp84944041 | Kembangan |
| Hp84128821 | Yishun |
| Hp88769491 | Jurong West |

The all-branch password Hp97533488 keeps working as now. The old full-access password Hp84311884 is removed entirely — from now on every delete made from /access goes to the superadmin dashboard for approval.

## What the user sees

- Entering a branch password opens the same page, with the branch already selected on every tab: Summary, School Fees, Students, Grading, Competitions, Seminars, Uniforms & Guards.
- Branch dropdowns are locked to that branch (shown, but not changeable), so other branches cannot be viewed.
- The branch name is shown next to the lock button so it is obvious which branch is open.
- Summary totals, student counts and the approval lists only count that branch.
- Delete buttons stay visible for everyone on /access, but pressing one asks for a reason and sends a delete request to the superadmin dashboard. Nothing is removed until a superadmin approves it.
- Hp84311884 no longer unlocks anything; anyone still using it must use the all-branch or their branch password.
- The 15-minute auto-lock and session memory behave as today; the locked branch is remembered for the session alongside the unlock level.


## Technical details

In `src/pages/public/PublicGradingList.tsx`:
- Add a `BRANCH_UNLOCK_PASSWORDS` map of password to branch id (`balmoral`, `bukit-merah`, `kembangan`, `yishun`, `jurong-west`).
- `handleUnlock` checks the branch map after the two existing passwords; a match sets `unlockLevel = 'standard'` and a new `lockedBranchId` state, persisted in `sessionStorage` (`guards_list_locked_branch_v1`) and cleared by `handleLock` and the auto-lock.
- Derive `lockedBranchName` from the public branches list; force `branchFilter` to it and ignore `setBranchFilter` while locked; render the branch `Select` disabled with that value.
- Pass `lockedBranchId`/`lockedBranchName` down so child tabs cannot widen the filter:
  - `SchoolFeesTab`, `SeminarsTab`, `CompetitionsTab` — add a `lockedBranch?: string` prop; when set, initialise and pin `localBranchFilter`, and disable their branch selects.
  - `StudentsTab` — add `lockedBranchId?: string`; pass it into `getPublicStudentDirectory` and disable its branch select.
  - `PublicGuardsPurchaseList` — add `lockedBranchId?: string`; pin its internal `branchFilter` and disable the select.
- Summary cards already derive from the branch-filtered rows, so they follow automatically; verify counts after the change.
- The AI Document tab keeps using the standard password value for its internal call.

No database changes; filtering is by the branch already returned on every row.

## Verification

Typecheck, check the build log, then unlock with each branch password and confirm every tab, dropdown and summary count is restricted to that branch, and that the two existing passwords still show all branches.
