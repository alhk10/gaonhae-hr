# Concise Grading tab rows

Make each grading registration in `/access` Grading a compact two-line row, matching the Students tab style.

## New row layout
```text
[ ] 1  AALIA BINTE MOHAMMAD LUQMAN  [Term paid] [Grading paid]   Foundation 1 → 3      [Pass v] [Remark v]  ✎ ↺ 🏅 🗑
       Carpe Diem Stradia · INV-2026-00528 · $49.05 · Proof
```
- Line 1: select box, number, name (opens profile), badges, belt change, result and remark dropdowns, action icons.
- Line 2 (left-aligned, small grey text): branch, invoice number (opens invoice), amount, proof link.
- Field labels ("Student", "Branch", "Status"...) removed from every row.
- On narrow screens, dropdowns and icons wrap under line 2.

## Badges (same colours as Students tab)
- Term invoice: green **Term paid**, red **Unpaid $X**, grey **No invoice**, amber **Trial**, based on the grading's own term.
- Grading: green **Grading paid** when paid/verified; amber **Ready for grading** when ticked but unpaid; otherwise the existing payment status (e.g. Pending).
- Belt shown short: "Foundation 1 → 3" when the same belt family.

## Technical details
- Edit the grading list rendering in `src/pages/public/PublicGradingList.tsx` (grading TabsContent); reuse `termBadge`/colour helpers from `StudentsTab.tsx` (extract to a shared util).
- Term invoice status fetched per student for the grading event's year/term via the existing grading ready-state data; no database changes.
- All existing actions, selection, edit/delete and certificate buttons kept unchanged.
