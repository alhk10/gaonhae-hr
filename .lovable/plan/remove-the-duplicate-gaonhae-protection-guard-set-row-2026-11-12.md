# Remove the duplicate "Gaonhae Protection Guard Set" row

## Why there are two
- The row marked **Package** is the real set customers buy (on, S$160 for this branch).
- The plain row is a copy created on 08/11 so package orders can show their line items on invoices. It is meant to stay behind the scenes, but the guards settings list also shows it as a normal product (toggled off). Nobody has bought it as a separate product.
- The Adidas set has the same kind of hidden copy. It's inactive, so it doesn't show today.

## Fix
- Hide these behind-the-scenes package copies from the Uniforms & Guards settings list and from the /hello shop product list, so each set appears once, as the Package row.
- Invoices keep using the copy to show what's in the set, so nothing changes on invoices or past orders.

## Technical details
- Products whose SKU starts with `PKG-` are the package mirrors. Filter them out in `GuardsProductSettingsDialog.tsx`, in the source behind the public guards product list (`_impl_guards_products_for_branch_admin` / the public product fetch), and in `PublicGuardsPurchaseList.tsx` if it lists products directly.
- No data is deleted.
