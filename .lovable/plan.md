## Goal
On `/grading-list`, replace the branch filter with a **grading date** filter, and sort slot cards by **earliest slot timing first** (date asc → start_time asc).

## Changes (file: `src/pages/public/PublicGradingList.tsx`)

1. Drop the branches query and branch `Select`.
2. Fetch full grading list (`getPublicGradingList({})` — no branch filter).
3. Derive distinct upcoming `grading_date` values from the rows, sorted ascending. Render them as the dropdown options (label via `formatDate`, value = ISO date). Add an "All dates" option. Default to the earliest upcoming date if available.
4. Filter `rows` client-side by selected date before grouping.
5. After grouping, sort groups by `grading_date` asc, then `start_time` asc (nulls last) so the earliest slot appears first.

No backend/RPC changes.