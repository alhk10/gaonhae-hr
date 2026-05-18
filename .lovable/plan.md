## Center-align PDF grading list cells; wrap long student names

File: `src/pages/public/PublicGradingList.tsx` — autoTable config (~lines 339-348)

1. Base `styles`: add `halign: 'center'`, `valign: 'middle'` (keep `overflow: 'linebreak'` so long Student names wrap onto multiple lines).
2. `headStyles`: add `halign: 'center'`, `valign: 'middle'`.
3. `columnStyles`: change col 0 (`#`) from `halign: 'right'` to `halign: 'center'`; remove explicit alignment from others so they inherit center.

No changes to on-screen UI, DB, or data layer — PDF-only.