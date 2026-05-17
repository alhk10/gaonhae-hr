## Plan — Foundation checkboxes + Video Test slot for Foundation 3

### Problem
On `/pay`, when Current Belt = Foundation 1/2/3:
1. The three grading transitions are auto-selected, but there's **no visible checkbox UI** — the user can't see or change them.
2. Foundation 3 currently can't pick the "Foundation Video Test" slot (it's filtered out by the grading slot RPC since no F3 transition product matches it).

### Frontend changes — `src/pages/public/PublicGradingPayment.tsx`

1. **Render a "Grading" checkbox group placed AFTER Current Belt and BEFORE Grading Slot**, shown only when `isFoundation && visibleProducts.length > 0 && !gating.blocked`:
   - One `<Checkbox>` per item in `visibleProducts`, label = `product_name — $branch_price`.
   - `checked` = id in `selectedProductIds`.
   - `onCheckedChange` reuses existing `toggleProduct` (already enforces the stair-step: checking item N selects N + all preceding; unchecking N clears N + all following).
   - Keep the existing auto-select-all effect so the default is everything checked.
   - Result:
     - Current Belt = F1 → shows F1, F2, F3 checkboxes; can't tick F2 without F1, can't tick F3 without F1+F2.
     - Current Belt = F2 → shows F2, F3.
     - Current Belt = F3 → shows F3 only.

2. **Allow Video Test slot for Foundation 3**: when `isFoundation`, call `getPublicGradingSlots` with `productIds = []` (don't filter by product) so all upcoming Foundation-eligible slots for the branch — including the Video Test stage slot — appear. The slot RPC still applies age/belt gating via `p_current_belt`. Selecting a stage slot keeps the existing `effectiveItems` override (price comes from the stage product).

### Out of scope
- No DB / RPC changes.
- No changes to non-foundation belts.
- No changes to pricing math, submission payload, or email.
