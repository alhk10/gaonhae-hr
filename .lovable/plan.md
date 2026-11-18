# Add estimated start times to the Registered Competitors PDF

Only the Registered Competitors PDF changes. The website page and other PDFs stay the same.

## What changes
- Each category heading gets its estimated start time on the right side of the same line, e.g.
  `7-8 Years · Geup 9 & 10 · Female · Taegeuk 1 Jang` ............ `9:15AM`
- I'll use the 20 times you listed, matched by age, grade, gender and pattern.
- Any category not on your list (for example, a new registration) shows no time, so nothing wrong gets printed.

## Technical details
- In `src/pages/public/PublicPerthComp.tsx`, add a fixed lookup keyed by the exact heading text, then draw the time right-aligned at page width − 14 on the same y as the heading.
- Then download the PDF to check that the times show and line up.
