## Filter grading slots by current belt

### Problem
Slot "Stage 11 - 26" (belt_levels: `[3rd Poom, 3rd Dan]`, `grading_product_ids: NULL`) is visible to a Blue belt user. The RPC `get_public_grading_slots` only filters by branch, age, and product IDs — it ignores the `belt_levels` column. When `grading_product_ids` is NULL the slot passes the product check and shows for everyone.

### Fix

**1. Migration — update `get_public_grading_slots` RPC**

Add a new parameter `p_current_belt text DEFAULT NULL` and an extra WHERE clause:
```
AND (
  p_current_belt IS NULL
  OR gs.belt_levels IS NULL
  OR array_length(gs.belt_levels, 1) IS NULL
  OR p_current_belt = ANY(gs.belt_levels)
)
```
Keep the existing signature working by creating the new overload (or replacing it — there are already two overloads in the DB, so we replace the latest 3-arg one and add `p_current_belt` as a 4th optional arg).

**2. Service — `src/services/gradingPaymentSubmissionService.ts`**

Add `currentBelt` arg to `getPublicGradingSlots` and pass `p_current_belt` to the RPC.

**3. Page — `src/pages/public/PublicGradingPayment.tsx`**

- Pass `currentBelt` into `getPublicGradingSlots(branchId, selectedProductIds, dobIso, currentBelt)`.
- Add `currentBelt` to the React Query `queryKey` and reset `selectedSlotId` when it changes.

### Result
A Blue belt user will no longer see slots restricted to `3rd Poom / 3rd Dan` (or any other mismatched belt). Slots with no `belt_levels` set remain visible to everyone (unchanged behaviour).
