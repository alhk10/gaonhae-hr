Registered Competitors PDF (/perthcomp)

- Remove the bold event title lines (e.g. "Geup 8 & 7 – Taegeuk 2 Jang").
- Each group sub-heading becomes "Age Years · Gender · Pattern", e.g. "5-6 Years · Male · Taegeuk 2 Jang" (grade text dropped, pattern name taken from the event label after the dash).
- Group ordering, separation by grade, tables, uppercase names/clubs and page numbers stay unchanged.

Technical: edit the PDF block in `src/pages/public/PublicPerthComp.tsx` — drop the `eventLabel` title line, and replace `gradeLabel(grade)` in the sub-heading with the pattern part of `eventLabel(ev.code)`.
