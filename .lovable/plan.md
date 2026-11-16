# Student count by month: count only the weeks actually paid

## What changes
- At the moment, a term payment counts the student in every month of the term, and a 4-week payment counts only in its starting month.
- New rule: each student counts in a month only if their paid weeks cover part of that month. The paid weeks run forward from the term start, or from the first invoice date for a late joiner. This is the same rule /hello and the fee badges already use.
- Example: in a 12-week term from September to November, a student who paid all 12 weeks counts in September, October and November. A student who paid only 4 weeks from the term start counts in September only, so October and November show fewer students.
- The note under the table changes to: "Students count in each month covered by the weeks they paid."
- Trial and ad-hoc lessons stay excluded.

## Technical details
- Rewrite `get_public_student_counts_by_month(p_year)` (migration). For each student and term with a paid or verified Classes invoice, take `covered_from` / `covered_until` from `public._term_coverage(student, term)`. The branch comes from the student's branch.
- Count `DISTINCT student_id` per branch and month wherever the covered span overlaps the month. The return shape stays the same, so the frontend needs no data changes.
- Update the caption text in `src/components/grading-list/SummaryTab.tsx`.
- Check with a query that a part-term student (for example Ronan, paid through 26/10) counts in September and October but not November.
