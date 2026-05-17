## Reorder grading form: products before slots

**File:** `src/pages/public/PublicGradingPayment.tsx`

### Changes

1. **Swap order** of blocks under "Current Belt":
   - Render the grading products card (foundation checkboxes / single product display) **before** the Grading Slot dropdown.
   - Render the Grading Slot dropdown **after** the products card.

2. **Gate the Grading Slot dropdown on a product selection:**
   - Change the slot render condition from `branchId && currentBelt && !gating.blocked` to also require `selectedProductIds.length > 0`.
   - For non-foundation belts (single product), ensure the product is auto-selected so the slot dropdown still appears; add an effect to set `selectedProductIds = [productList[0].product_id]` when `!isFoundation && productList.length === 1` if not already happening.

3. **Subtotal, GST, and Total lines remain after the Grading Slot** — keep the existing totals summary rendered below the slot dropdown, unchanged in position relative to the slot.

4. **Block message** (`gating.blocked` Alert) stays in its current position.

No backend/RPC changes. No business logic changes beyond the slot visibility gate.