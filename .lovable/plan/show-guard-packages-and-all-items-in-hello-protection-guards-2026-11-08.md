# Show guard packages and all items in /hello "Protection Guards & Accessories"

## What's wrong
For Balmoral students, the /hello list shows only 3 items, even though the branch has 22 items, including the two packages:
- Gaonhae Protection Guard Set ($160)
- Preorder - Adidas Chest Guard + Head Gear Set ($260)

The signed-in student list follows a different, stricter rule from the guards price list that was fixed earlier:
1. It only shows items a branch has switched on one by one. The fixed rule shows everything unless the branch has switched it off.
2. It never includes packages, because they aren't regular catalogue items.

## Fix
1. **Same item rule:** in both Protection Guards and Uniforms, show every active item unless the branch has switched it off. Belt and age limits still apply.
2. **Add packages:** list each package available to the branch at the top of Protection Guards, with the branch package price and a "Package" label.
3. **Checkout:** the invoice gets a package line at the package price, with credits applied first as usual. Ordered packages appear in the /access Guards list, like other guard orders.

## Technical details
- Migration: in `get_public_chat_products_for_student` (and the anon `get_public_chat_products`), replace `gbp.is_available = true` with `COALESCE(gbp.is_available, true)`.
- Packages: in the protection category, return the package rows from `get_public_guards_products` (item_type 'package') with `metadata.item_type='package'` and `package_id`. `submit_public_chat_invoice` resolves a package line on the server to the branch package price, and the guards order is linked so it shows in /access.
- `PublicHelloChat.tsx`: show the Package badge and pass the package id in cart items.
- Verify: query Balmoral for Teoh Kar Yee's session and confirm all 8 protection items plus the 2 packages appear, with prices matching /access.
