Registered Competitors PDF sub-heading format (/perthcomp)

- Each group heading becomes: Age Years · Event grade · Gender · Pattern
  - e.g. "7-8 Years · Geup 9 & 10 · Female · Taegeuk 1 Jang"
  - merged events shown low-to-high: "Geup 9 & 10", "Geup 7 & 8"; single events unchanged (e.g. "Geup 4", "Poom/Dan").
- Nothing else in the PDF changes.

Technical: in `src/pages/public/PublicPerthComp.tsx`, split `eventLabel(ev.code)` into grade part and pattern part; reverse "X & Y" in the grade part to ascending; build heading `${d} Years · ${gradePart} · ${g} · ${pattern}`.
