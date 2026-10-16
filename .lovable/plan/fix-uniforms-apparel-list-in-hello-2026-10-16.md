# Fix Uniforms & Apparel list in /hello

## What's wrong (confirmed from live data)
- On /hello, the uniform list only includes products that have a belt restriction matching the student's belt. Of the 11 uniform products, only Adidas Dan Champ II and Adidas Dan Uniform have belt levels set (1st–5th Dan).
- So for most students the White, Poom and Poomsae uniforms never show up, even though they are switched on for every branch. Non-Dan students get an empty list or the wrong one.
- /hello also ignores the branch Available switches and branch prices in the settings screen you showed. Products switched off (Hoodie, T-Shirt, Gaonhae White Uniform, Dan Champ II) can still show, and branch price overrides aren't used.

## Fix
1. Uniforms on /hello follow the branch settings screen: a product shows only if it is switched on for the student's branch.
2. Use the branch price from that screen when one is set; otherwise use the default price.
3. Keep the belt restriction only for products that have one (e.g. Dan uniforms are for Dan students only). Products with no belt restriction show for everyone.
4. Leave Protection Guards & Accessories unchanged unless they have the same problem. I'll check them while doing this fix.

## Technical details
- Update `get_public_chat_products_for_student` for the uniform category: join `guards_branch_products` on product_id + branch_id, require `is_available = true`, and use `COALESCE(g.price_override, pr.price_override, p.base_price)` as branch_price.
- Change the belt rule to `p.allowed_belt_levels IS NULL OR (v_current_belt IS NOT NULL AND p.allowed_belt_levels @> ARRAY[v_current_belt])`.
- Verify by calling the function for a Balmoral color-belt student and a Dan student. Expected: color belt gets White, Poom and the 4 Poomsae uniforms. Dan student also gets Adidas Dan Uniform. Neither gets the switched-off items.
