## Show Stage slots based on current belt

### Problem
Stage slots have specific `grading_product_ids` (different from belt-transition products), so the current RPC filter hides them even when the user's belt matches `belt_levels`.

Examples in DB for 28/06/2026 Balmoral:
- Stage 1 - 3 → belt_levels `[1st Poom, 1st Dan]`, has product IDs
- Stage 4 - 10 → belt_levels `[2nd Poom, 2nd Dan]`, has product IDs
- Stage 11 - 26 → belt_levels `[3rd Poom, 3rd Dan]`, no product IDs

A 1st Poom user selecting the "1st Poom >> 2nd Poom" product currently only sees that transition slot — Stage 1 - 3 is filtered out by the product check.

### Fix
Update RPC `get_public_grading_slots` so a belt match overrides the product filter. New WHERE for product/belt:

```
AND (
  -- belt match always wins
  (p_current_belt IS NOT NULL AND p_current_belt = ANY(gs.belt_levels))
  OR (
    -- otherwise fall back to existing product rule
    (
      p_product_ids IS NULL
      OR array_length(p_product_ids, 1) IS NULL
      OR gs.grading_product_ids IS NULL
      OR array_length(gs.grading_product_ids, 1) IS NULL
      OR gs.grading_product_ids && p_product_ids
    )
    AND (
      p_current_belt IS NULL
      OR gs.belt_levels IS NULL
      OR array_length(gs.belt_levels, 1) IS NULL
      OR p_current_belt = ANY(gs.belt_levels)
    )
  )
)
```

Net effect:
- 1st Poom / 1st Dan → sees "1st Poom >> 2nd Poom" transition + Stage 1 - 3
- 2nd Poom / 2nd Dan → sees "2nd Poom >> 3rd Poom" transition + Stage 4 - 10
- 3rd Poom / 3rd Dan → sees Stage 11 - 26 (already worked)
- Other belts → unchanged
- Stage slot with mismatched belt remains hidden (e.g. Blue belt no longer sees Stage 11 - 26)

### Files
- New migration replacing `get_public_grading_slots` (4-arg signature kept).
- No frontend changes required — service already passes `currentBelt`.
