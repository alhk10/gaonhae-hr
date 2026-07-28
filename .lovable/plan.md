## Problem

Clicking a Summary number switches tab and sets the branch filter, but the Competitions and Seminars tables come back empty, and rows already verified/collected still show.

Confirmed cause: the Summary tables use branch **names**, while `get_public_competition_list` and `get_public_seminar_list` filter with `WHERE branch_id = p_branch_id`. The frontend passes the branch name into `p_branch_id`, so no rows match and the tabs render empty.

## Changes

1. **Stop sending branch names into the RPCs** (`PublicGradingList.tsx`, `SeminarsTab.tsx`)
   - Call `getPublicCompetitionList(null)` and `getPublicSeminarList(null, ...)` and filter by `branch_name` on the client (Competitions already does this via `localBranchFilter`; add the same to Seminars), or map name → branch id before calling. Client-side filtering is preferred so it stays consistent with the other tabs.

2. **Drill also applies a status filter**
   - Extend `onDrill` to carry an intent: `pending` (from "Pending approvals by branch") or `uncollected` (from "Uncollected guards by branch").
   - School Fees / Grading / Competitions / Seminars: set their status filter to pending-verification so verified and rejected rows are hidden.
   - Guards: set the collected filter to "uncollected" (plus the branch), matching the second summary table.

3. **Guards branch prop** — already wired via `initialBranchName`; add an `initialCollectedFilter` prop so the drill can set it.

4. **Reset behaviour** — filters set by a drill remain user-editable; returning to Summary and drilling again overwrites them.

## Technical notes

- Files: `src/components/grading-list/SummaryTab.tsx`, `src/pages/public/PublicGradingList.tsx`, `src/components/grading-list/SeminarsTab.tsx`, `src/components/grading-list/SchoolFeesTab.tsx`, `src/pages/public/PublicGuardsPurchaseList.tsx`.
- No database or RPC changes needed.
