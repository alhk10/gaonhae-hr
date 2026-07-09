## Problem

On `/grading-list` (PublicGradingList), the generated certificate prints the **student's live belt** (`students.current_belt`) instead of the **belt they graded from** for that specific grading (`grading_registrations.current_belt`).

- Ayden Tan graded Yellow Tip → Yellow, but his `students.current_belt` is still `Foundation 3` (never re-synced from an earlier grading), so cert reads "Foundation 3".
- Xavier Toh graded Red Tip → Red, but his `students.current_belt` is `Blue`, so cert reads "Blue Belt".

The row itself already carries the correct registration snapshot in `r.current_belt` — the display column "Yellow Tip → Yellow" comes from that field. The bug is only in the certificate input builder.

## Root cause

`src/pages/public/PublicGradingList.tsx` line 1018 and 1031:

```ts
const belt = beltOverride ?? r.student_current_belt ?? r.current_belt;
```

This prefers the live student belt over the registration's frozen "from-belt". When the two diverge (student promoted past this grading, or never re-synced), the cert prints the wrong belt.

## Fix

Swap the fallback order so the **registration's `current_belt`** (the belt they actually graded from) is the source of truth, with `student_current_belt` only as a fallback when the registration snapshot is missing.

### Changes in `src/pages/public/PublicGradingList.tsx`

1. **`rowToCertInput` (line 1018)** — change to:
   ```ts
   const belt = beltOverride ?? r.current_belt ?? r.student_current_belt;
   ```

2. **`certFilename` (line 1031)** — same swap for consistent filenames:
   ```ts
   const belt = beltOverride ?? r.current_belt ?? r.student_current_belt ?? 'Belt';
   ```

3. Tooltip at line 1500 already uses `r.current_belt` — no change needed.

## Scope

- Frontend-only, single file.
- No schema, service, or data changes.
- The two other certificate call sites (`components/sales/GradingListTab.tsx`, `components/dashboard/BranchGradingList.tsx`) already use the registration snapshot correctly (`current_belt: reg.current_belt || student.current_belt`) — no change needed there.

## Verification

After the change, on `/grading-list`:
- Ayden Tan's certificate reads **"Yellow Tip Belt"**.
- Xavier Toh's certificate reads **"Red Tip Belt"**.
- Every other row's certificate matches the "X → Y" belt column shown next to the student's name.
