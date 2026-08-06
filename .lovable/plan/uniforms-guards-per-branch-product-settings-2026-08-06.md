# Uniforms & Guards: per-branch product settings

Rename the Guards area to **Uniforms & Guards** and add a Settings button on the tab in `/access` that controls which items appear on the public purchase page, per branch.

## What changes

### Naming
- `/access` tab label: "Guards" becomes "Uniforms & Guards".
- List heading: "Guards Purchase List" becomes "Uniforms & Guards Purchase List".
- Public page (`/guards`) title and confirmation copy use "Uniforms & Guards". The URL stays `/guards` so existing QR codes and links keep working.

### Settings dialog
A gear button sits to the right of the filters on the tab (same placement and look as the School Fees settings button). It opens a dialog with:
- A branch selector at the top; all settings apply to the selected branch.
- **Packages** section: the two existing bundles (Gaonhae Protection Guard Set, Preorder - Adidas Chest Guard + Head Gear Set), each with an availability switch and an optional price override for that branch.
- **Individual products** section: every active product in the "Uniforms & Apparels" and "Protection Guards & Accessories" categories, each with an availability switch and an optional price override.
- Save writes only the rows that changed; unsaved rows are highlighted until saved.

Default behaviour when nothing has been configured for a branch: the two packages are available, individual products are not. This keeps the current public page unchanged until an admin opts items in.

### Public purchase page
- The item list is loaded per selected branch instead of being hardcoded. Choosing a branch first is required before items appear (the branch field already exists on the form).
- Packages and individual products are shown in two labelled groups, each with a quantity/tick control as today, with description and branch price.
- Individual products that carry size/colour/gender variants are recorded on the submission the same way package components are, so the admin list keeps working.
- GST handling, proof upload, submission and confirmation stay as they are.

### Admin list
- Rows continue to show whatever items the buyer selected, including individual products.

## Technical detail

- Migration: new table `public.guards_branch_products` (branch_id, item_key, product_id nullable, is_available, price_override, timestamps, unique on branch + item key) with GRANTs, RLS, and superadmin-only writes; public read via a security-definer RPC. Package rows use fixed keys `gaonhae_set` / `adidas_set`; product rows use the product id as the key.
- Two RPCs mirroring the School Fees pattern: `get_guards_products_for_branch_admin(p_branch_id)` returning every candidate item (packages plus the two categories) with the branch's availability and override, and `admin_set_guards_product_branch_setting(...)` to upsert one row.
- Public read RPC `get_public_guards_products(p_branch_id)` returning only available items with the effective price, used by `/guards`.
- New component `src/components/grading-list/GuardsProductSettingsDialog.tsx`, modelled on `SchoolFeeProductSettingsDialog.tsx`.
- `src/services/guardsPurchaseService.ts`: keep `GUARDS_CATALOG` as the package definition source, add the RPC wrappers and a `GuardsBranchItem` type; the cart item type gains an optional `product_id`.
- `src/pages/public/PublicGuardsPurchase.tsx`: replace the static `GUARDS_CATALOG` mapping with a branch-scoped query.
- `src/pages/public/PublicGradingList.tsx`: tab label plus the settings button wiring; `PublicGuardsPurchaseList.tsx`: heading and settings button slot.
