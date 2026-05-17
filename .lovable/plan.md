## Sequential Foundation grading selection

**File:** `src/pages/public/PublicGradingPayment.tsx`

### Behavior
- Current belt = Foundation 1 → show F1>>F2, F2>>F3, F3>>White. User must tick in order (F2>>F3 disabled until F1>>F2 ticked; F3>>White disabled until F2>>F3 ticked).
- Current belt = Foundation 2 → show only F2>>F3 and F3>>White. F3>>White disabled until F2>>F3 ticked.
- Current belt = Foundation 3 → show only F3>>White.
- Unticking an earlier item auto-unticks all later items.

### Implementation
1. Add a `visibleProducts` memo derived from `productList`: sort by FOUNDATION_BELTS source-belt index (parsed from `product_name` prefix `Foundation N`), then keep only those whose source-belt index ≥ index of `currentBelt`.
2. Render `visibleProducts` (instead of raw `productList`) in the foundation checkbox block.
3. For each row, compute `disabled = previousVisibleItemNotChecked`. Pass `disabled` to `Checkbox` and apply `opacity-50 cursor-not-allowed` to the label when disabled.
4. Update `toggleProduct` (or add a new handler) so that when unchecking item at index `i`, all items at index > `i` are also removed from `selectedProductIds`. When checking, no change needed since UI prevents out-of-order checks.

No backend / data / schema changes. Slot fetching already keys off `selectedProductIds` and will continue to work.
