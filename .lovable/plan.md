# Auto-verify Limited Edition orders (Gareth Goh, Nathan Cho)

## Why it didn't happen
Both orders are Limited Edition T-shirt orders from /hello, correctly matched (Gareth $60, Nathan $30, PayNow). Auto-verify only runs when the payment screenshot has been read and its amount equals the amount due. The Limited Edition order window never reads the screenshot, so both orders have no scanned amount ("Scanned $..." is missing in the list) and the check never runs. This affects every Limited Edition order, not just these two.

## Fix
1. After a Limited Edition (or any Uniforms & Guards) order is submitted, read the uploaded screenshot on the server and save the scanned amount on the order. The existing rule then auto-verifies when matched and the amount is exact to the cent, and the invoice is created as usual.
2. Run the scan once for existing pending orders with no scan yet, including Gareth and Nathan, so they verify automatically if their screenshots show $60.00 / $30.00.
3. Show the scanned amount on these rows in the approvals list, like grading rows.

## Technical details
- Extend `scan-payment-proof` edge function with `guards_purchase_ids`: service-role loads rows with `proof_scan_status is null` and `sale_status='pending_verification'`, downloads proof from `payment-proofs`, compares to `total` (SGD/AUD by branch country), updates `proof_scan_status/amount/details`; the existing `trg_auto_verify_scan` trigger handles verification.
- Call it fire-and-forget from `submitGuardsPurchase` in `guardsPurchaseService.ts` with the inserted id.
- One-off backfill call for pending unscanned orders.
