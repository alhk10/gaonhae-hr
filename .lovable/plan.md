## Goal

Add a "Student count" card to the Summary tab in `/access` showing, for each branch, how many distinct students are covered by paid lessons in each of the 12 months of a selected year.

## Counting rules

Source: `entitlements` (created from paid lesson invoices), joined to `products` and `branches`.

- Only active entitlements for lesson products (exclude Trial Lesson and Ad-Hoc Lesson).
- **Term payments** (coverage longer than ~5 weeks, e.g. 03/01–29/03): the student is counted in every month the period touches.
- **4-week payments** (coverage of 5 weeks / 35 days or less): the student is counted in one month only — the month `valid_from` falls in.
- Each student is counted at most once per branch per month, even with several entitlements.
- Branch comes from `entitlements.branch_scope`, resolved to a branch name; unresolved values group under "—".

## Data access

`/access` is a public, password-gated page, so the browser uses the anon role and cannot read `entitlements` directly.

- New `SECURITY DEFINER` RPC `get_public_student_counts_by_month(p_year int)` returning `branch_name`, `month` (1–12), `student_count`, with `GRANT EXECUTE` to `anon` and `authenticated`. It applies the rules above entirely in SQL and returns only aggregate counts (no student identities).
- New service helper `getPublicStudentCountsByMonth(year)` in `src/services/gradingPaymentSubmissionService.ts`.

## UI

In `src/components/grading-list/SummaryTab.tsx`, below the existing pending/guards cards:

- A card titled "Student count by branch" with a year selector defaulting to the current calendar year and also offering the next year.
- Table: one row per branch, columns Jan–Dec plus a "Peak" column (highest month), and a Total row summing branches per month.
- Blank/dash cells for zero, horizontally scrollable on mobile, compact `text-xs` styling matching the other summary tables.
- Counts are display-only (no drill-through) in this first version.

## Technical notes

- Month overlap computed with `generate_series` over months of the year intersected against `[valid_from, valid_to]`, with a `CASE` that collapses short (<= 35 day) entitlements to the `valid_from` month.
- Distinct counting via `count(distinct student_id)` per branch/month.
- Query cached with React Query keyed on the selected year.
