# Make /hello uniform & guards items and prices match /access (Balmoral and all branches)

## What's wrong
- /hello shows a product only if it was switched on in the branch's Guards product settings. Products nobody configured (Color Belt, Custom Black/Poom Belt, Custom uniforms, Hoodie, White T-Shirt, White Uniform, Adidas Dan Champ II, etc.) are hidden, but /access invoices offer them.
- /hello prices use the guards setting first, then the catalogue base price. They ignore the branch price rules that /access invoices use. /access uses the guards setting first, then the branch price rule, then the base price.

## Changes
1. **Show items by default**: every active Uniforms & Apparels / Protection Guards product appears on /hello unless staff have switched it **off** for that branch. Items switched off stay hidden (e.g. Balmoral's Gaonhae Arm/Shin/Groin set and Adidas Chestguard set).
2. **Same price as /access**: /hello price = guards branch price → active branch price rule (within its dates) → base price. This is the same order the invoice editor uses.
3. **Settings screen matches**: switches for products nobody has configured will show **on**, and the price column shows the branch price, so what staff see matches /hello.
4. Age/belt limits on products still apply as they do now.

## Technical details
- New migration replaces `get_public_guards_products` and `get_guards_products_for_branch_admin`: `LEFT JOIN guards_branch_products`, `COALESCE(s.is_available, true)`, price `COALESCE(s.price_override, rule.price_override, p.base_price)` using a lateral join to the latest active `price_rules` row for that branch/product where `effective_from <= current_date` and `effective_to` is empty or ≥ today.
- Packages are unchanged.
- Check: compare the Balmoral /hello list with `get_branch_unit_prices('balmoral')` to confirm every price matches.
