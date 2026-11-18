# Registered Competitors PDF: bold title, counts in footer

1. Show the title **Gaonhae & Friends Competition 2026** in bold. The screenshot shows the older wording, and the title already uses this name since the last update.
2. Move the "26 competitors · 29 entries · Generated DD/MM/YYYY HH:MM" line from under the heading to the footer of every page. It sits bottom left, on the same line as "Page X of Y" on the right.
3. The competitor list moves up to fill the space left by that line.

## Technical
- `src/pages/public/PublicPerthComp.tsx` `downloadCompetitorsPdf`: set bold font for the title then reset it, drop the counts line, and shift the start `y` up. In the page-number loop, also draw the counts text at the left margin.
