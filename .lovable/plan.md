## Goal

On the Summary tab of `/access`, make each non-zero count clickable: clicking jumps to the matching tab with that branch pre-selected in its branch filter.

## How it works

**src/pages/public/PublicGradingList.tsx**
- Convert the `Tabs` from `defaultValue="summary"` to a controlled `value`/`onValueChange` pair backed by new state `activeTab`.
- Add a handler `handleSummaryDrill(tab, branchName)` that sets `activeTab` and the shared `branchFilter` state (branch name), then passes the branch through to whichever tab needs its own local filter.
- Pass `onDrill={handleSummaryDrill}` into `<SummaryTab />`.

**src/components/grading-list/SummaryTab.tsx**
- Accept an optional `onDrill?: (tab: 'school-fees'|'grading'|'competitions'|'seminars'|'guards', branch: string) => void`.
- Render each non-zero cell value in the "Pending approvals by branch" table as a button-styled link (underline on hover, `text-primary`, `cursor-pointer`) that calls `onDrill` with the column's tab key and the row's branch name. Zero cells stay as the plain `–`.
- Same treatment for the "Uncollected guards by branch" rows: the count and the branch row drill into the Guards tab filtered to that branch.
- Total row and grand-total cells stay non-clickable (no single branch).

**Per-tab branch filter wiring**
- School Fees and Seminars already receive the shared `branchFilter` (branch name) — no change needed.
- Competitions tab uses its own `localBranchFilter`; add an optional `initialBranchFilter` prop and sync it into `localBranchFilter` via an effect keyed on the prop so drilling applies it.
- Guards list (`PublicGuardsPurchaseList`) filters by branch **id**, not name; add an optional `initialBranchName` prop, resolve it to the branch id via the existing `branches` list, and apply it to its internal `branchFilter` when it changes.

## Notes

- No database or service changes; all frontend state wiring.
- Clicking the same cell again re-applies the same filter (idempotent).
