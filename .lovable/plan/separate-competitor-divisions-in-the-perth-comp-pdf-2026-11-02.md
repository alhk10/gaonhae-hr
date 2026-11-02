# Separate competitor divisions in the Perth Comp PDF

## What changes
In the "List of Registered Competitors" PDF (and the staff Competition Log PDF), competitors inside each event will be split into divisions by:
1. **Age category** (youngest first)
2. **Gender** - Male and Female listed separately
3. **Grade** - competitors with a different actual grade are no longer grouped together, even if they entered the same event (e.g. Leah Giam, 1 Geup, and Phoebe Giam, Poom/Dan, both in "Poom/Dan - Taegeuk 8 Jang" become separate divisions)

Division heading example: `9-11 Years - Female - 1 Geup (1)`.

Entry rules (students can enter their own grade or higher) stay the same; no registrations or payments are changed.

## Technical details
- In `src/pages/public/PublicPerthComp.tsx`, change the PDF grouping key from `event > age` to `event > age > gender > grade`, sorting gender Female/Male and grade by `_perth_grade_rank` order (from `perthCompRules.ts`).
- Apply the same subgrouping to the staff Competition Log PDF.
- Download both PDFs once to check layout.
