## Fix: Grading Slot dropdown not visible

### Problem
On `/pay`, after choosing Current Belt (e.g. Blue → Red Tip), the Grading Slot dropdown does not appear between Current Belt and the pricing card. It is currently rendered only when `selectedProductIds.length > 0`, which means:
- Foundation belts: hidden until user ticks a product checkbox.
- Non-foundation belts: depends on auto-select effect firing before render — fragile.
- Also, the RPC `get_public_grading_slots` filters by `gs.grading_product_ids && p_product_ids`, so slots without product tagging never appear.

### Fix
In `src/pages/public/PublicGradingPayment.tsx`:

1. **Move the Grading Slot block** to render whenever `branchId && currentBelt && !gating.blocked` (drop the `selectedProductIds.length > 0` gate). Keep it positioned directly after the Current Belt field, before the pricing card.
2. **Enable the slot query on branch alone** — `enabled: !!branchId` — and pass `selectedProductIds` only as an optional filter.
3. **Loosen the RPC filter** in a new migration so a slot is returned when EITHER:
   - no product ids were passed, OR
   - the slot has no `grading_product_ids` (untagged → assume open to all), OR
   - the slot's `grading_product_ids` overlaps with `p_product_ids`.
4. Keep `selectedSlotId` required in `canSubmit` (already the case).

### Files
- `src/pages/public/PublicGradingPayment.tsx` — reposition + un-gate the slot Select; relax query `enabled`.
- New migration — update `get_public_grading_slots` with the looser product filter.

### Out of scope
Email field placement, DOB picker, email sending, pricing logic — already implemented and untouched.
