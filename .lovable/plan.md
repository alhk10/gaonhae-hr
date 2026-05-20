## Problem

On `/grading-payment` (and the `/hello` chat grading flow), the Grading Slot dropdown shows "No upcoming slots available" for an 18 y/o Red-belt student at Balmoral.

## Root cause

`get_public_grading_slots(p_branch_id, p_product_ids, p_dob, p_current_belt)` currently:

1. Uses `JOIN public.branches b ON b.id = gs.branch_id` — an INNER JOIN that drops every slot where `grading_slots.branch_id IS NULL`.
2. Requires `gs.branch_id = p_branch_id OR p_branch_id = ANY(gs.available_branch_ids)`.

There are 2 upcoming slots on 28/06/2026 with `branch_id = NULL` and `available_branch_ids = NULL`, intended as cross-branch teen/adult gradings (e.g. "28/06/2026 - 13:50 - Blue to Red", `min_age = 13`, `belt_levels = {Blue, Red, Red Tip}`). These are silently filtered out, leaving an 18 y/o Red belt with no eligible Balmoral slot (the branch-specific Red slot is capped at `max_age = 14`).

The branch-specific dashboard `BranchWeeklyTimetable` reads `grading_slots` directly and already shows these slots, so the issue is isolated to the public RPC.

## Fix

Update `public.get_public_grading_slots(text, uuid[], date, text)` so that slots without a specific branch are treated as available to every branch:

- Change `JOIN public.branches b ON b.id = gs.branch_id` to `LEFT JOIN`.
- Replace the branch filter with:
  ```
  (
    gs.branch_id = p_branch_id
    OR (gs.available_branch_ids IS NOT NULL AND p_branch_id = ANY(gs.available_branch_ids))
    OR (gs.branch_id IS NULL AND (gs.available_branch_ids IS NULL OR array_length(gs.available_branch_ids, 1) IS NULL))
  )
  ```
- For cross-branch rows, return the requested branch's name/address (lookup `p_branch_id` from `branches`) so the UI still shows a meaningful location label.

No data backfill required; existing branch-specific slots continue to behave as before. Age and belt filters already cover eligibility.

## Out of scope

- No UI changes to `PublicGradingPayment.tsx` or `PublicHelloChat.tsx`.
- No changes to `get_public_grading_slots_by_date` (used elsewhere) unless the same bug is confirmed there in a follow-up.
- Slot data entry (e.g. setting `available_branch_ids` per slot) remains a separate admin concern.
