# Grading List PDF: show current belt only

## Change
In the downloadable Grading List PDF, the Belt column shows only the student's current belt (e.g. "Red" instead of "Red > Black Tip", "Foundation 3" instead of "Foundation 3 > White"). Each group title already names the grading (e.g. "Red >> Black Tip").

- The column becomes narrower, giving student names more room so fewer of them wrap.
- The on-screen Grading tab is unchanged.

## Technical details
- `PublicGradingList.tsx` `handleDownloadPdf`: `pdfBelt(r)` returns `r.current_belt || '-'`; reduce `cw.belt` from 24 to 18 mm (student column widens automatically; row-height measurement already uses the same helper).
