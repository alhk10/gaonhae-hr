## Issue

Screenshot shows the Competitions tab with `Green / Red / Blue Tip` under the **Age** header — i.e. belt values rendered in the Age column. After re-checking:

- `get_public_competition_list` RPC **does** return `date_of_birth` (verified in DB).
- The TSX has 17 `<TableCell>`s matching 17 `<TableHead>`s. The Age cell at line 2242 correctly reads `r.date_of_birth`, and Belt at line 2250 reads `r.current_belt`.

The most likely cause of the screenshot is a stale React-Query cache from before `date_of_birth` was added to the row type (the in-memory cache returns rows without `date_of_birth`, but in that case the cell renders `'—'`, not a belt — so there is also a real shift bug we need to flush out). I'll harden the column so it can't be confused with Belt and force a clean refetch.

## Fix (frontend only)

In `src/pages/public/PublicGradingList.tsx`, Competitions section:

1. Replace the inline IIFE Age cell with a small parser that handles `YYYY-MM-DD` safely in UTC (avoids timezone off-by-one) and never falls through to a non-numeric value:
   ```ts
   const ageByYear = (dob?: string | null): number | null => {
     if (!dob) return null;
     const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
     if (!m) return null;
     const y = parseInt(m[1], 10);
     if (!y) return null;
     return new Date().getFullYear() - y;
   };
   ```
   Render: `{ageByYear(r.date_of_birth) ?? '—'}` wrapped in `tabular-nums` so it visually cannot be mistaken for a belt label.

2. Bump the React-Query `queryKey` for the competition list (e.g. add a `'v2'` segment) so any cached pre-migration payload is discarded on next mount.

3. Re-confirm head/cell count and that no conditional `<TableCell>` is rendered in the Age slot.

## Out of scope

- Seminars tab (no Age column there by design).
- PDF print generator, edit dialog, public submission form.

## Technical notes

- No DB changes — RPC already returns `date_of_birth date`.
- No service-layer changes — `PublicCompetitionListRow.date_of_birth` already exists.
- Pure presentational edit in `PublicGradingList.tsx`.