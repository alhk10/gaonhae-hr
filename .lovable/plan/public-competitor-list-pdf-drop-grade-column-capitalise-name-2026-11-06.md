# Public competitor list PDF: drop Grade column, capitalise names and clubs

Applies to the public "List of Registered Competitors" PDF only.

- Remove the **Grade** column from every table, leaving # / Name / Club.
- Show every competitor name and club name in capital letters, e.g. "GAONHAE TAEKWONDO". This also tidies mixed entries like "GAONHAE Taekwondo".
- Group headings stay as they are (for example "7-8 Years · Female · 7 Geup (3)"), so competitors of different grades remain in separate divisions.
- Saved entries are not changed. Capitals are applied only when the PDF is printed.

## Technical
- `src/pages/public/PublicPerthComp.tsx` (around lines 185–189): remove the Grade header and `gradeLabel(r.grade)` cell, and change the body to `[i+1, name.toUpperCase(), (club||'').toUpperCase()]`.
