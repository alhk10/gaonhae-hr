# Lock settings to the branch's own password

## The problem
Some /access settings windows let staff pick **any branch**, and the server doesn't check the branch password before saving them. A Balmoral password can change Kembangan's prices, as in your screenshot. Someone outside /access could also call these saves directly.

Settings that **are not** checked today:
- Uniforms & Guards availability: per-branch price and on/off.
- Uniforms & Guards age and belt limits. These apply to **every** branch.
- Class fee pricing per branch.
- Grading slots: create, edit, hide, delete.
- Studio rental settings and the rental agreement text.

Settings that **are already** checked by branch password: Attendance settings, timetable, class types and colours, terms and term breaks, mute unpaid warnings, Calendar as Term, and the progress card switch.

## What will change
1. **Branch picker locked.** In these settings windows, branch staff see only their own branch, or the branches on their password (like Stradia). The all-branch password (Hp97533488) and superadmin still see every branch.
2. **Server checks on every save.** Each save above checks the /access password against the branch being changed. A wrong branch is refused with "This password can't change another branch's settings."
3. **Whole-company settings are all-branch only.** Age/belt limits on products, the studio rental agreement text and grading slots shared with several branches can only be changed with the all-branch password or by a superadmin. Branch staff see them read-only.
4. **Grading slots:** a branch can edit or delete only its own slots. A slot shared to other branches stays editable only by its own branch or the all-branch password.
5. **Double-check the already-protected ones.** Confirm that timetable, term and term-break saves check the branch **of the row being saved**, not just the password, and fix any that don't.

## Not in this change (flagged)
The same check found about 60 other staff actions that can also be called without a password. They include matching, rejecting and deleting /hello submissions, importing entries, and deleting grading registrations. They aren't settings, but they carry the same risk. I recommend locking them down the same way next.

## Technical details
- Add `p_password text` and a check to: `admin_set_guards_product_branch_setting` and `admin_set_class_product_branch_pricing` (`_access_branch_check(pw, p_branch_id)`); `admin_set_guards_product_restrictions`, `admin_save_studio_rental_agreement_template` and `admin_upsert_studio_rental_settings` (`_access_require_all`, or the studio branch check for settings); `admin_upsert_grading_slot`, `admin_set_grading_slot_meta` and `admin_delete_grading_slot` (branch check on the slot's existing branch, plus all-branch when `available_branch_ids` spans other branches); `get_guards_products_for_branch_admin` (read check).
- Superadmin bypass: `auth.uid()` is a superadmin.
- Drop the old no-password function versions; revoke from anon.
- Frontend: pass the /access password from the session context in `guardsPurchaseService`, the class pricing, grading slot and studio rental services. Dialogs (`GuardsProductSettingsDialog` and siblings) take `allowedBranchIds` and `isAllBranch` from the /access session, filter the branch Select, and disable the restriction editors unless all-branch.
- Browser check with a branch password: only the own branch is listed, and saving another branch through the API is refused.

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
