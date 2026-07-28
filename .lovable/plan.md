## Goal

Add a new **Summary** tab as the first tab (left of Grading) in `/grading-list`, giving an at-a-glance count of items still awaiting approve/reject action, broken down by branch and by tab, plus uncollected guards by branch.

## What it shows

**Table 1 — Pending approvals by branch**

| Branch | Grading | Competitions | Seminars | Guards | Total |
|---|---|---|---|---|---|

- Each cell = number of rows in that tab whose payment status is still awaiting a decision (`pending verification` / `pending`), i.e. rows where the approve/reject buttons are shown.
- A **Total** row at the bottom sums each column.
- Branches with zero pending across all tabs are hidden (with a "nothing pending" empty state if all are clear).
- Clicking a cell jumps to that tab (branch filter applied where that tab supports one).

**Table 2 — Uncollected guards by branch**

| Branch | Uncollected orders | Amount |
|---|---|---|

- Counts guards purchases where `collected` is false (excluding rejected/cancelled rows), with the summed amount and a grand-total row.

## Technical notes

- New component `src/components/grading-list/SummaryTab.tsx`.
- It reuses the existing React Query keys already used by the other tabs (`public-grading-list`, `public-competition-list`, `public-seminar-list`, `guards-purchases`) via the same service functions, so no new RPCs or DB changes are needed and the summary stays in sync when rows are approved elsewhere.
- Aggregation is done client-side by `branch_name` (falling back to "—" when null).
- `TabsList` in `src/pages/public/PublicGradingList.tsx` goes from `grid-cols-4` to `grid-cols-5`, with `summary` added first and set as the default tab value.
- Mobile: tables collapse to stacked per-branch cards, consistent with existing responsive patterns on this page.

## Open assumption

I'll treat "yet to approve or reject" as rows with a pending/unverified payment status, since that's what gates the approve/reject buttons in each tab. If you meant something else (e.g. unverified documents), say so and I'll adjust.
