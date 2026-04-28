## Plan — Fix grading list row ordering by belt rank

### Problem
In the grading list, rows within the same grading slot (and across slots that share the same time) are sorted alphabetically by slot title and then by student name. This produces incorrect ordering:
- Kayden HII (Blue belt) appears before Yui Cheung (Blue Tip) because they sit in different slots whose titles sort alphabetically.
- Earl John Lucero II (White), Henry Morgan (Foundation), Teo Olivere Tabigue (Foundation) appear in the wrong belt order for the same reason — alphabetical title/name sort ignores belt rank.

The slot title and the student name don't reflect the official belt progression (Foundation 1/2/3 → Foundation → White → Yellow Tip → … → Blue Tip → Blue → Red Tip → … → Dan ranks).

### Fix
Sort rows within each grading date by the student's **current belt rank** (lowest belt first, following the canonical `BELT_LEVELS` order from `@/constants/beltLevels`), then by name as a tiebreaker. Slot title is no longer used as a sort key — the belt rank already gives the correct visual grouping.

New sort order:
1. Unassigned (no slot date) first, sorted by name (unchanged).
2. Then by `grading_slot_date` ascending.
3. Then by **current belt rank ascending** using the index from `BELT_LEVELS` (Foundation 1 → … → 5th Dan). `null` / "No belt" sorts first.
4. Then by `student_name` ascending.

### Files to edit
- `src/components/dashboard/BranchGradingList.tsx` — replace the slot-title-based comparator (~line 407) with belt-rank comparator.
- `src/components/sales/GradingListTab.tsx` — same change (~line 416).

Both files will import a small helper that returns the belt rank index from `BELT_LEVELS_ARRAY`, with unknown/null belts sorting before "Foundation 1".

### Out of scope
- No changes to the grading slot data model, slot titles, or filtering.
- No changes to the bulk certificate printing feature.
- No changes to column widths.
