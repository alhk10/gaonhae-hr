# Invoice prices follow branch settings

## What's wrong
The Arm, Shin & Groin Protector Set is set to $160 for every Singapore branch in branch settings, but the invoice shows $100 (the product's base price). Branch prices for guards are saved in their own branch-product list, and the invoice screen never reads that list. It only reads the general per-branch price list, which has no entry for this product.

The edit-invoice screen also ignores branch prices completely when you change a line's product.

## Fix
One shared "price for this branch" lookup, used everywhere the invoice screen fills in a price:
1. Guards branch price (if set and the guard is available at that branch)
2. Otherwise the general branch price override
3. Otherwise the product's base price

Apply it to:
- Picking a product on a new invoice (also removes a second spot that resets the price back to base).
- Changing a line's product when editing an invoice.
- Product dropdown price labels, so the shown price matches what gets filled in.
- The /access invoice screen (password users), through its existing product catalog loader.

Existing invoices are not changed; staff can still type a different price where allowed.

## Technical details
- Add `resolveBranchUnitPrice(product, branchId, priceRules, guardsBranchProducts)` in `src/utils/` with unit tests (guards override $160 beats base $100; price_rules used when no guards override; base fallback).
- `InvoiceDialog.tsx`: load `guards_branch_products` (product_id, branch_id, price_override, is_available) alongside price_rules; replace `getBranchPrice`; fix `handleNewItemChange('product_id')` and `handleEditProductChange` to use the resolver with the invoice's branch.
- `invoiceService.ts` access catalog: include guards branch prices (extend the catalog RPC if it doesn't already return them; read-only, branch-scoped).
