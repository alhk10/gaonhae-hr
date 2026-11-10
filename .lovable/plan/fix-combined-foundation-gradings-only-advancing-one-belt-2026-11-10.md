# Fix combined Foundation gradings only advancing one belt

## Cause (confirmed)
Kaden's invoice INV-2026-00522 has three grading lines (F1>F2, F2>F3, F3>White), but only **one** grading registration was created, linked to the F1>F2 line. When it was marked Pass, the belt moved F1 -> F2 and stopped there. The other two lines never got a registration, so nothing moved him further.

One other invoice has the same problem (F2>F3 + F3>White, only one registration).

## Fix
1. **Belt outcome for combined Foundation gradings**: when a registration's invoice holds several Foundation lines for the same student, the Pass result uses the full chain (lowest "from" to highest "to"), e.g. F1 >> White. Applied in the database outcome function and the matching app helper, so belt, grading history and certificates agree.
2. **Grading history row** shows the combined step (Foundation 1 >> White) instead of only the first line.
3. **Repair data**: recompute Kaden (-> White) and the other affected student, only where the current belt still equals the single-step result (same cautious rule used in the earlier backfill).
4. **Tests**: add a test that F1>F2 + F2>F3 + F3>White resolves to White on Pass.

## Technical notes
- Extend `_grading_effective_belts` to chain all `Foundation X >> Y` lines on the same invoice for that student; mirror in `src/utils/gradingOutcome.ts`.
- Re-run the belt sync for the two invoices (f56c821e..., 059584ae...).
- Certificates: one certificate for the final belt (White), unless you prefer one per step.
