## Problem

On `/pay`, an under-15 student at **1st Poom** at Balmoral only sees one slot:
`Balmoral - 28/06/2026 - 1st Poom >> 2nd Poom`

The Stage 1-3 slot for 1st Poom/1st Dan exists and is correctly configured (belt_levels=[1st Poom, 1st Dan], product=[Stage 1-3]), but it never appears. Same hidden-slot problem affects:
- **2nd Poom / 2nd Dan** → Stage 4-10 slot is hidden
- **3rd Poom / 3rd Dan** → Stage 11-26 slot is hidden

### Root cause

`PublicGradingPayment.tsx` auto-selects the single transition product returned by `getPublicGradingProducts` (e.g. `1st Poom >> 2nd Poom`) and passes `selectedProductIds` into `get_public_grading_slots`. The RPC requires `grading_product_ids && p_product_ids` overlap, so the Stage 1-3 slot — whose `grading_product_ids` only contains `Stage 1-3` — is filtered out.

The Stage slots already self-describe their eligibility via `belt_levels` + `min_age`/`max_age`, and the RPC's `stage_product_id` lateral join overrides product + price at booking time. The product-overlap pre-filter is redundant and actively wrong for Stage slots.

## Plan

Treat slot eligibility as **belt + age + branch driven**, not driven by the user's auto-selected transition product. The selected product becomes the *default* line item; if the chosen slot is a Stage slot, its `stage_product_id`/price override applies (already implemented in `effectiveItems`).

### 1. Frontend — `src/pages/public/PublicGradingPayment.tsx`

- Remove the `selectedProductIds` filter when querying slots for non-Foundation belts. Pass `[]` to `getPublicGradingSlots` for everyone, same way Foundation already does.
- Drop `slotProductIds` and update the query key to remove `selectedProductIds.join(',')` (keep `branchId`, `dobIso`, `currentBelt`).
- Keep `effectiveItems` logic unchanged — Stage slot still overrides product + price; transition slot still falls back to `selectedItems`.
- No changes to product checkbox UI, foundation flow, or submission payload.

### 2. Backend

No DB changes. The current `get_public_grading_slots(p_branch_id, p_product_ids, p_dob, p_current_belt)` already:
- Skips product filter when `p_product_ids` is empty.
- Hard-gates by `belt_levels` (open when null/empty).
- Hard-gates by `min_age`/`max_age`.
- Joins `stage_product_id`/`stage_product_branch_price` for Stage slots.

### Result

For Alvin (1st Poom, Balmoral, under 15), the slot dropdown will show both:
- `28/06/2026 - 1st Poom >> 2nd Poom` (transition slot, $470 + GST)
- `28/06/2026 - Stage 1-3` (stage slot, price from `Stage 1-3` product / branch price rule)

Selecting the Stage slot rewrites the invoice line item to "Stage 1-3" automatically via existing `effectiveItems` logic. Same behavior cascades to 2nd Poom/2nd Dan (Stage 4-10) and 3rd Poom/3rd Dan (Stage 11-26).

### Out of scope

- Changes to `get_public_grading_products`, `get_public_payment_options`, or grading write paths.
- UI restructuring of the payment form.
- Foundation flow (already working).