# Competitor list PDF tidy-up

Changes to the public "Registered Competitors" PDF only:

1. **Align columns across tables** — every table uses the same fixed widths (# narrow, Name fixed, Club fixed), so club/school names line up in one column down every page.
2. **Remove the group header** — drop the blue "# / Name / Club" header bar from each table. Category lines (e.g. "12-14 Years · Female · 3 Geup") and event headings stay.
3. **Remove counts in brackets** — category lines no longer end with "(2)".

## Technical
- `src/pages/public/PublicPerthComp.tsx` `downloadCompetitorsPdf`: remove `head`, set `columnStyles` `{0:{cellWidth:10},1:{cellWidth:85},2:{cellWidth:'auto'}}` with fixed `tableWidth`, and drop `(${list.length})` from the subheading.
