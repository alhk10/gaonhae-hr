# Stage-slot product override

## Goal

On the public `/pay` page, when a user selects a grading slot whose `grading_product_ids` reference a Stage product (e.g. "Stage 1 - 3"), the selected product and pricing should switch from the belt-transition product (e.g. "1st Poom >> 2nd Poom" @ $470) to the Stage product (e.g. "Stage 1 - 3" @ $55).

Mapping (already in DB):
- Stage 1 - 3 → 1st Poom / 1st Dan slots
- Stage 4 - 10 → 2nd Poom / 2nd Dan slots
- Stage 11 - 26 → 3rd Poom / 3rd Dan slots

## Approach

The slot row already carries `grading_product_ids` pointing at the Stage product. The cleanest fix is to surface that on the slot returned by the RPC and let the frontend override the selection when a slot with stage products is chosen.

## Changes

### 1. DB migration — extend `get_public_grading_slots`

Add new returned columns:
- `stage_product_id uuid`
- `stage_product_name text`
- `stage_product_branch_price numeric`

For each slot row, if `grading_product_ids` is not empty and the first product's name matches `Stage%`, join `products` (and `price_rules` for branch override) to populate the three new fields. Otherwise leave them NULL.

Keep the existing 4-arg signature and existing filter logic untouched.

### 2. `src/services/gradingPaymentSubmissionService.ts`

Extend `PublicGradingSlot` interface with the three new optional fields.

### 3. `src/pages/public/PublicGradingPayment.tsx`

After the existing `selectedSlot` memo, add an effect:

```text
when selectedSlot changes and selectedSlot.stage_product_id is set
and current selectedProductIds does not equal [stage_product_id]:
  setSelectedProductIds([stage_product_id])
```

Then derive `selectedItems` to prefer the stage product data when present so the Subtotal / GST / Total reflect the Stage price ($55) instead of the belt-transition price. Concretely: build a synthetic item `{ product_id, product_name, branch_price, current_belt }` from `selectedSlot.stage_*` when applicable, and use it in place of the productList lookup.

Submission already sends `items[].product_id` + `amount`, so swapping in the stage product flows through to `grading_payment_submissions.resolved_product_id` and `amount` with no further changes.

Also guard the slot-reset effect so changing the slot does not wipe the override loop (only reset when belt/branch/product-driver changes, not on every slot pick).

## Out of scope

- Foundation flow (no Stage slots apply).
- Admin grading management screens.
- Dan-side pricing is identical to Poom-side Stage products in DB, so no extra branching needed.

## Verification

After applying:
- Pick 1st Poom, choose the "Stage 1 - 3" slot → product card shows "Stage 1 - 3", total $55 (+GST in SG).
- Pick 1st Poom, choose the "1st Poom >> 2nd Poom" slot → unchanged ($470).
- Same checks for 2nd Poom (Stage 4 - 10) and 3rd Poom (Stage 11 - 26).
