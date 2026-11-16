# Student count by month: count students only in months they mostly paid for

## Rule
- A student's paid weeks run forward from the term start, or from the first invoice date for a late joiner. This is the same rule /hello and the fee badges use.
- For each month, compare the student's paid lessons in that month with the term's lessons in that month.
- The student counts in a month only when they have paid for **more than half** of that month's term lessons.
- Example 1: a student pays for 4 weeks of lessons, all in November. They count in November only, not in October or December.
- Example 2: a student pays for 8 weeks, covering 2 lessons in October, 3 in November and 3 in December, where each month has about 4 term lessons. They count in November and December. October is left out because 2 of 4 lessons is not a majority.
- A student who paid the full term counts in every month of the term.
- Trial and ad-hoc lessons stay excluded.
- The note under the table changes to: "Students count in a month when their paid weeks cover most of that month's lessons."

## Technical details
- Migration: rewrite `get_public_student_counts_by_month(p_year)`.
  - For each student and term with a paid or verified Classes invoice, read `covered_from` / `covered_until` from `_term_coverage`.
  - Build the term's weekly lesson dates from the term start (skipping term breaks), then count covered and total lessons per month.
  - Include the student when covered lessons × 2 > total lessons for that month. Group by the student's branch.
- The return shape stays the same. Update only the caption in `SummaryTab.tsx`.
- Verify with queries that a part-term student (for example Ronan, paid through 26/10) drops out of the later months.
