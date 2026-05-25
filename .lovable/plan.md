## Changes to `src/pages/public/PublicGuardsPurchase.tsx`

1. Compute `detailsFilled = !!firstName.trim() && !!lastName.trim() && !!branchId`.
2. Wrap the Items section, totals block, Payment Method/info block, Proof of Payment upload, and Submit Order button so they only render when `detailsFilled` is true.
3. Only render the "We will ensure student get the right sizes" line when the Gaonhae set checkbox is checked (`q > 0`).
4. When the Adidas set checkbox is checked, render a small note below it: "Please expect a 3 to 4 week wait time after order has been verified."

## Changes to `src/services/guardsPurchaseService.ts`

5. Update the `adidas_set` catalog entry label from `'Adidas Chest Guard + Head Gear Set'` to `'Preorder - Adidas Chest Guard + Head Gear Set'` so the prefix shows on the public form and flows through to invoice line labels.

No other files, services, or DB changes are needed.