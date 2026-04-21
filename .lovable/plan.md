

## Plan: Sort the Grading List by belt progression (Foundation → 5th Dan), then by name

### Current behavior

`src/components/sales/GradingListTab.tsx` line 366 sorts the displayed students alphabetically by `student_name`. The screenshot shows White, Yellow Tip, Foundation, Green, etc. mixed together.

### Change

Replace the alphabetical sort with a belt-progression sort, breaking ties by name.

In `src/components/sales/GradingListTab.tsx`:

1. Import the existing helper:
   ```ts
   import { compareBeltLevels } from '@/constants/beltLevels';
   ```
   (Already exported from `src/constants/beltLevels.ts`. The unified `BELT_LEVELS` order — `Foundation 1/2/3` → `Foundation` → `White` → `Yellow Tip` → … → `5th Dan` — covers both SG and AU students appearing in the same list.)

2. Replace the sort at line 366:
   ```ts
   result.sort((a, b) => {
     const beltCmp = compareBeltLevels(a.current_belt || '', b.current_belt || '');
     // Unknown/empty belts (index -1) drop to the bottom
     const aIdx = a.current_belt ? 0 : 1;
     const bIdx = b.current_belt ? 0 : 1;
     if (aIdx !== bIdx) return aIdx - bIdx;
     if (beltCmp !== 0) return beltCmp;
     return a.student_name.localeCompare(b.student_name);
   });
   ```

No country argument is passed, so the default SG list is used — which already contains every belt name AU students might have (`Foundation`, `White`, …), so AU students still sort correctly inside the same combined order.

### Verification

On Morley → Term 2 2026:
- `EARL JOHN LUCERO II` (Foundation), `HENRY MORGAN` (Foundation) appear first.
- Then White: `ALEX NOH`, `ELLIOT HII`, `KALLI LUCERO`.
- Then `DANIEL IM` (Yellow Tip).
- Then Green: `ETHAN BONDARENKO`, `IAN BYEON`, `JIHO SONG`.
- Within each belt group, names are alphabetical.
- Students with no recorded belt fall to the bottom.

### Out of scope

- Adding a column header click-to-sort UI.
- Persisting the sort preference.
- Changing belt order constants.

