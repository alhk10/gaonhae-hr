# Add a 1.2 cm top margin to the Progress Report Card

On each student's progress report card page, move everything down by 12 mm (1.2 cm) so the logo, kicking cartoon and title no longer sit at the top edge of the page.

- The logo, title, kicking cartoon, tagline, student info box, the four rating sections, and the "Ready for Grading Test?" box with its thumbs-up cartoon all move down 12 mm together. Spacing between them stays the same.
- The "RESPECT • DISCIPLINE • CONFIDENCE • PERSEVERANCE" footer stays at the bottom. After the shift there is still about 4 cm of clear space above it, so nothing overlaps or runs off the page.
- The summary and attendance pages stay as they are.

## Technical details
- `src/utils/progressCardPdf.ts`, card loop: add `const T = 12` and add it to every hard-coded y value. That covers the logo (4), title (18), kick art (1), tagline (26), info rect (30), info rows (37, 46.5), section origin (54) and grading box `gy` (214). The footer at y=288 stays unchanged.
- Generate a sample card PDF to confirm the spacing.
