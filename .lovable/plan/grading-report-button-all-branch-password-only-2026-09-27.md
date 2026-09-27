# Grading report button — all-branch password only

On /access, the Grading tab's "Download Summary PDF" button (the grading report) currently appears for every unlocked session, including branch-locked passwords. Restrict it so it only appears when the page was unlocked with the all-branch password Hp97533488.

## What the user sees

- Unlocking /access with Hp97533488 shows the grading report (Summary PDF) button on the Grading tab, as before.
- Unlocking with a branch password (Balmoral, Bukit Merah, Kembangan, Yishun, Jurong West) no longer shows the grading report button; everything else stays the same.
- The regular "Download PDF" grading list button remains available to all unlocked users.
- The choice is remembered for the session and cleared on lock, same as the existing unlock level.

## Technical details

In `src/pages/public/PublicGradingList.tsx`:
- Add an `isAllBranch` state (boolean), set true only when `handleUnlock` matches `ADMIN_UNLOCK_PASSWORD` (Hp97533488), false for branch-password unlocks.
- Persist it in `sessionStorage` alongside the existing unlock keys (e.g. `guards_list_all_branch_v1`); restore on load, clear in `handleLock` and the auto-lock.
- Change the Summary PDF button gate at ~line 1486 from `canDelete` to `canDelete && isAllBranch`.

No database changes.

## Verification

Typecheck, check the build log, then unlock with Hp97533488 (button visible) and with a branch password (button hidden, rest of tab unchanged).
