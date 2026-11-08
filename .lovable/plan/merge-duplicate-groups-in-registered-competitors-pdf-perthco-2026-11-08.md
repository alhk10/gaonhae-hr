Merge duplicate groups in Registered Competitors PDF (/perthcomp)

- Within each event, group competitors only by age category and gender (the event already sets the grade), so e.g. Yui Cheung and Kayden Hii appear together under one "9-11 Years · Geup 2 · Male · Taegeuk 7 Jang" table, numbered 1, 2.
- Normalise age category text (trim spaces, unify dashes) so identical categories always merge; also removes the stray extra space before "·".
- Merged events (Geup 9 & 10, Geup 7 & 8) likewise show one table per age/gender.

Technical: in `src/pages/public/PublicPerthComp.tsx` PDF block, change group key from `division|gender|grade` to `norm(division).trim()|gender`, sort groups by division then gender, and use the trimmed division in the heading.
