## Goal
On the public `/pay` page, the Foundation 1/2/3 belts currently appear in the "Current Belt" dropdown only when the student is age 5 or under. We want to extend this so a child who has just turned 6 — within 3 months of their 6th birthday — can still select a Foundation belt and register for the grading test.

## Scope
Frontend-only change on `/pay`. No database, RPC, or backend changes are required (slot age limits remain governed by each grading slot's own `min_age` / `max_age`, which the user can adjust per slot if needed).

## Change

In `src/pages/public/PublicGradingPayment.tsx`:

1. Replace the integer-only `age` check used by `filterBeltsByAge` with a finer "age in months" check for Foundation belts.
2. Allow Foundation belts when:
   - the student is age 5 or under (current behaviour), **or**
   - the student is age 6 and the 6th birthday was within the last 3 months (i.e. less than 6 years 3 months old at today's date).
3. Keep Poom (<15) and Dan (≥15) rules unchanged.

### Technical detail
- Add a helper `monthsSinceBirth(dob)` that returns the student's age expressed in whole months from DOB to today.
- In `filterBeltsByAge`, for `FOUNDATION_ALL` belts, return `months <= 75` (6 years × 12 + 3 months buffer) instead of `age <= 5`.
- Pass the DOB (already collected in the form) into `filterBeltsByAge` alongside the existing integer age, or refactor it to take DOB directly. The function already runs only when DOB is set, so no new validation states are required.
- No copy/UI text changes; the buffer is silent.

## Out of scope
- Server-side product/slot eligibility (handled per slot via `min_age`).
- Other age-gated belts (Poom, Dan) — unchanged.
- The internal student-portal grading flow — unchanged.
