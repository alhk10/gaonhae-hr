## Hide the product/price card on /pay

Remove the box that displays the grading product name and price (e.g. "Green Tip >> Green" and "$90.00") from the public grading payment form. The selection logic, slot dropdown, and totals summary card below remain intact.

### Change

**File:** `src/pages/public/PublicGradingPayment.tsx`

Delete the JSX block at lines 518–571 (the `<div className="rounded-md border p-3 bg-background space-y-2">` that branches into the Foundation checklist and the non-Foundation single product display).

### Implications

- Foundation users will no longer see the multi-select grading checklist on this page. Since product selection happens implicitly via `selectedProductIds` (auto-populated from `productList` for non-Foundation; first product for Foundation), we will preload Foundation's `selectedProductIds` with all available products by default so the slot dropdown and totals still work.
- Specifically, when `isFoundation` is true and `selectedProductIds` is empty, initialise it to all `visibleProducts` ids (or just the first one — to be confirmed). Default proposal: select **all** visible Foundation products so the experience matches today's "checked from top down" behaviour.
- The bottom Subtotal/GST/Total card (line 598+) continues to show what is being paid, so the user still sees the price before submitting.

### Verification

- Open `/pay`, fill branch + DOB + belt = "Green Tip" → the "Green Tip >> Green / $90.00" card no longer appears; slot dropdown and totals card still show $90.00.
- Belt = "1st Poom" with a Stage 1-3 slot → Stage override still flows into the totals card.
- Foundation belt (e.g. "No Belt") → totals card shows all Foundation grading fees summed; submission still works.

### Out of scope

- Any RPC / DB change.
- The bottom totals/summary card.
- Removing Foundation logic entirely.
