## Filter grading slots by student age (DOB vs slot min_age/max_age)

### Problem
`/pay` shows all grading slots for the branch regardless of the student's age. `grading_slots` already has `min_age` and `max_age` columns, but the public RPC ignores them.

### Fix

**1. New migration** — overload `get_public_grading_slots` to accept a date of birth and filter by it:

```sql
CREATE OR REPLACE FUNCTION public.get_public_grading_slots(
  p_branch_id text,
  p_product_ids uuid[],
  p_dob date DEFAULT NULL
) RETURNS TABLE (...same as today...)
```

Add to the WHERE clause:
```sql
AND (
  p_dob IS NULL
  OR (
    (gs.min_age IS NULL
      OR date_part('year', age(gs.grading_date, p_dob)) >= gs.min_age)
    AND
    (gs.max_age IS NULL
      OR date_part('year', age(gs.grading_date, p_dob)) <= gs.max_age)
  )
)
```

Age is computed at the slot's `grading_date` (not today), which matches how grading eligibility is determined elsewhere. Slots with NULL min/max stay open. Grant execute to `anon` and `authenticated`.

**2. `src/pages/public/PublicGradingPayment.tsx`**
- Compute `dobIso` from the existing DOB day/month/year selects (only when all three are set and form a valid date).
- Pass it to the RPC call (`p_dob: dobIso ?? null`).
- Add `dobIso` to the React Query `queryKey` so the slot list refreshes when DOB changes.
- Keep the existing render gate (`branchId && currentBelt && !gating.blocked`); also require a valid DOB before showing the slot dropdown, since age filtering depends on it.
- If `selectedSlotId` no longer appears in the refreshed list (DOB change made it ineligible), clear it.

### Files
- New migration: extend `get_public_grading_slots` with `p_dob` + age filter.
- `src/pages/public/PublicGradingPayment.tsx`: pass DOB to the RPC, gate dropdown on DOB, clear stale selection.

### Out of scope
Email field, email sending, pricing, belt logic — untouched.
