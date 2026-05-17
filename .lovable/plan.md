## Plan — Derive grading slot eligibility from slot config, not requesting branch

### Problem
On `/pay`, slot list uses `get_public_grading_slots` which currently requires the slot's `branch_id` to match the chosen branch (or appear in `available_branch_ids`). So a Kembangan 1st Poom student can't see a Balmoral 1st Poom slot, even though both belts are eligible.

The user wants eligibility derived purely from what the slot itself accepts:
- **Belt** → slot's `belt_levels`
- **Age** → slot's `min_age` / `max_age` evaluated on `grading_date`
- **Product/transition** → slot's `grading_product_ids`

Branch should no longer gate visibility.

### DB change — replace `get_public_grading_slots(p_branch_id, p_product_ids, p_dob, p_current_belt)`

Same signature/return shape (UI keeps working). Rules:

1. **Drop the branch filter entirely.** Remove the `gs.branch_id = p_branch_id OR p_branch_id = ANY(available_branch_ids)` clause. `p_branch_id` is kept only to resolve `stage_product_branch_price` via `price_rules` (already lateral-joined).
2. **Belt gating (hard)** — if `gs.belt_levels` is non-empty AND `p_current_belt` is provided, require `p_current_belt = ANY(gs.belt_levels)`. If `gs.belt_levels` is empty/NULL, the slot is open to any belt.
3. **Age gating (hard)** — when `p_dob` is provided and `min_age`/`max_age` are set, age on `grading_date` must fall in range. (Same as today.)
4. **Product gating (soft, slot-driven)** — if `gs.grading_product_ids` is non-empty, require overlap with `p_product_ids` **only when** `p_product_ids` is non-empty. If the caller passes an empty/null product list (Foundation case, or any case where we want all eligible slots), don't filter by product. If `gs.grading_product_ids` is empty/NULL, the slot is open to any transition.
5. **Date + status** unchanged: `grading_date >= CURRENT_DATE`, `status <> 'cancelled'`.
6. Keep `ORDER BY grading_date, start_time`. Optional: secondary sort to surface the requesting branch's own slots first (`(gs.branch_id = p_branch_id) DESC`) so local slots show on top while cross-branch slots are still listed.

Result: a 1st Poom slot at Balmoral lists for any 1st Poom student regardless of their selected branch, as long as age/product rules also pass.

### Frontend — no code changes required
`PublicGradingPayment.tsx` already calls `getPublicGradingSlots(branchId, productIds, dobIso, currentBelt)` and renders `s.location || s.branch_name`, which will naturally show the slot's hosting branch. The Foundation flow (which passes empty `productIds`) keeps working because product filter is skipped when caller provides none.

### Out of scope
- No change to `get_public_payment_options` (still scoped to chosen branch for bank/PayNow details and pricing).
- No change to `get_public_grading_products` (pricing still uses the chosen branch's `price_rules`).
- No change to grading registration / payment submission write paths.
- No UI restructuring beyond what's already shipped.
