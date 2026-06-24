## Goal
Add three new columns (Competition Time, Reporting Time, Court) before the Branch column in the Competition Scoring print PDF, and sort rows by competition time.

## Changes

### 1. `src/utils/competitionPrintPDFGenerator.ts`
- Extend `CompetitionPrintRow` with `competition_at: string | null`, `reporting_at: string | null`, `court: string | null`.
- Insert three new columns into `cols` immediately before `branch`:
  - `comp` — "Comp Time" (~18mm, center)
  - `report` — "Report Time" (~18mm, center)
  - `court` — "Court" (~14mm, center)
- Shrink other columns proportionally to keep total = 277mm usable width (landscape A4). Suggested new widths:
  - idx 7, comp 18, report 18, court 13, branch 22, name 40, belt 18, category 40, p1 24, p1s 18, p2 24, p2s 18, remarks 17 (sum 277).
- Format times as `HH:mm` (slice ISO timestamp, fall back to empty string).
- Render values in `drawRow` via the existing `values` map.

### 2. `src/pages/public/PublicGradingList.tsx` (`handlePrintPdf`)
- Map the three fields into each `printRow` (`competition_at`, `reporting_at`, `court` from the source row).
- Change the sort: replace the current `student_name` `localeCompare` with sort by `competition_at` ascending; rows with no time go to the bottom. Tie-break by `student_name`.

## Out of scope
- No schema changes; fields already exist on `PublicCompetitionListRow`.
- No UI changes to the on-screen table.
