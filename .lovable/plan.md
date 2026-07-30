# Load historical gradings on date select (/access → Grading tab)

## Cause (verified)

`get_public_grading_list` filters with `gs.grading_date >= COALESCE(p_from, CURRENT_DATE - INTERVAL '30 days')`, and the page calls `getPublicGradingList({})` with no `from`. So only the last 30 days onward is ever fetched, and the Date dropdown — built from the loaded rows — can only ever offer those same recent dates. Past gradings are therefore invisible.

## Backend (migration)

Add `get_public_grading_dates()` — `SECURITY DEFINER`, granted to `anon, authenticated`. Returns the distinct `grading_date` values (with row counts) across grading slots that have at least one registration or non-rejected unmatched submission, over all time, ordered newest first. This populates the dropdown independently of the row query.

## Frontend — `src/pages/public/PublicGradingList.tsx`

- New query `['public-grading-dates']` → `getPublicGradingDates()` feeds the Date dropdown, so every historical grading date is listed (newest first, with an "All upcoming" default kept as today-onward).
- Change the list query to be date-driven: `queryKey: ['public-grading-list', dateFilter]`, calling `getPublicGradingList({ from: dateFilter, to: dateFilter })` when a specific date is selected, and `{ from: <today − 30d> }` when "All" is selected. Selecting a past date therefore loads that day's rows on demand.
- Keep the existing default behaviour: on first load, pre-select the nearest upcoming (or most recent) date rather than "all".
- Remove the now-redundant `dateOptions` derivation from `rows`; keep branch options derived from the loaded rows for the selected date.
- Client-side `filteredRows` no longer needs to filter by date (the server does), only by branch — leave the guard in place harmlessly for the "all" case.

## Notes

Grouping, sorting, export, mass-edit and slot dialogs are unchanged; they operate on whatever rows the date query returns.
