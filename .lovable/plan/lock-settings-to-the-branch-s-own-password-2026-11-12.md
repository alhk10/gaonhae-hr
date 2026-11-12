# Lock settings to the branch's own password

## The problem

Some /access settings windows let staff pick **any branch**, and the server doesn't check the branch password before saving them. A Balmoral password can change Kembangan's prices, as in your screenshot. Someone outside /access could also call these saves directly.

Settings that **are not** checked today:

- Uniforms & Guards availability: per-branch price and on/off.
- Uniforms & Guards age and belt limits. These apply to **every** branch.
- Class fee pricing per branch.

Settings that **are already** checked by branch password: Attendance settings, timetable, class types and colours, terms and term breaks, mute unpaid warnings, Calendar as Term, and the progress card switch.

## What will change

1. **Branch picker locked.** In these settings windows, branch staff see only their own branch, or the branches on their password (like Stradia). The all-branch password (Hp97533488) and superadmin still see every branch.

---

# Also: show guard packages when creating an invoice

## The problem

The two guard packages, **Gaonhae Protection Guard Set** and **Preorder - Adidas Chest Guard + Head Gear Set**, are switched off as products. The /guards and /hello pages list them through their own package list, but the staff Create Invoice product picker only shows switched-on products. That's why they're missing under Protection Guards & Accessories.

## What will change

- Both packages appear in the Create and Edit Invoice product picker, under Protection Guards & Accessories.
- Each package uses the branch's price from Uniforms & Guards availability, otherwise its default price ($174.40 / $284.30).
- A package switched off for a branch is hidden on that branch's invoices.
- /hello and /guards stay as they are, so packages don't show twice.

## Technical details

- In the invoice product loader, include products whose name matches the package list from `get_guards_products_for_branch_admin` (`item_type='package'`), even when `is_active=false`.
- Map `guards_branch_products.price_override` and `is_available` (keyed by `gaonhae_set` and `adidas_set`) onto those products.