# Fix Protection Guards & Accessories list in /hello

## What's wrong (confirmed from live data)
- /hello shows every active guard product (5 items) and ignores the branch settings screen in /access (Uniforms & Guards > Settings). None of these 5 products has a branch setting yet, so switches and branch prices have no effect.
- Item rows show no price, and long names are cut off ("Adidas Arm, Shin & Groin Protector Set - ...").

## Fix
1. Protection Guards & Accessories follow the branch settings screen, the same way Uniforms now do: an item shows only when switched on for the student's branch, at that branch's price (default price if blank).
2. To avoid an empty list after the change, switch on the 5 currently active guard products for every branch (Gaonhae Arm/Shin/Groin Set, Adidas Arm/Shin/Groin Set - Preorder, Adidas Black Belt, Adidas Chestguard & Headgear Set - Preorder, Face Shield). Staff can then turn any off per branch.
3. Belt restriction stays only for products that have one.
4. Each item row shows its price, and long names wrap onto two lines instead of being cut off (applies to Uniforms too).

## Technical details
- Update `get_public_chat_products_for_student` protection branch: join `guards_branch_products` on product_id + branch_id, require `is_available`, price `COALESCE(g.price_override, pr.price_override, p.base_price)`, belt rule `allowed_belt_levels IS NULL OR @> [current belt]`.
- Data insert into `guards_branch_products` (item_key = product id) for the 5 active products x all branches, `is_available = true`, skipping existing rows.
- `ProductRow` in `PublicHelloChat.tsx`: replace `truncate` with `line-clamp-2 break-words`, show `getDisplayPrice` under the name for non-lesson items.
- Verify by calling the function for AARI SANJIV (Balmoral) and checking the rendered list.
