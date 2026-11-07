# Fix: /hello guard prices ignore branch settings

## What was found
- Balmoral's saved price for the Gaonhae Arm, Shin & Groin Protector Set is $185, and the database returns $185 for Balmoral.
- /hello still shows $140. Some older products carry a fixed Singapore price, and on /hello that fixed price replaces the branch price:
  - Gaonhae Arm, Shin & Groin Protector Set: $140
  - Face Shield: $25 (Balmoral setting is $20)
  - Adidas Arm, Shin & Groin Protector Set (Preorder): $185
  - Adidas Chestguard & Headgear Set (Preorder): $284.30
- The fixed price applies to every Singapore branch, so branch price changes for these four items never reach /hello. It affects both the price shown and the amount charged.

## Fix
1. Have /hello always use the branch price from the branch settings (guard price, then branch price rule, then base price), the same order /access and invoices use.
2. Remove the old fixed Singapore prices from those four products so they can't come back anywhere.
3. Check: open /hello as a Balmoral student and confirm the Protector Set shows $185 and Face Shield shows $20, and that the checkout total matches.

## Technical details
- `getDisplayPrice` in `PublicHelloChat.tsx` returns `metadata.sg_target_price` / `au_target_price` before `branch_price`. Change it to return `branch_price`. That value comes from `get_public_chat_products_for_student`, which already resolves the guards override → price rule → base price.
- Use a data update to strip `sg_target_price` / `au_target_price` from `products.metadata`. Nothing else reads these keys.
