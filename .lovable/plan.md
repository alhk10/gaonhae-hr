# Restrict /accessories to 4 fixed bundle products

Replace the open product list on `/accessories` with exactly 4 bundle "products", each composed of existing catalog items. No new DB products; all bundle logic lives in the frontend. Bundles are expanded into real product line items when verification creates the combined invoice on `/accessories-list`.

## The 4 bundles

| # | Bundle name | Underlying products |
|---|---|---|
| 1 | Gaonhae Arm, Shin, Groin Guard Set | Gaonhae Arm Guard + Gaonhae Shin Guard + Gaonhae Male **or** Female Groin Guard |
| 2 | Adidas Arm, Shin, Groin Guard Set | Adidas Arm Guard + Adidas Shin Guard + Adidas Groin Guard (Male **or** Female) |
| 3 | Adidas Headgear (Red) & Chest Guard Set | Adidas Headgear (color=Red) + Adidas Chestguard |
| 4 | Adidas Headgear (Blue) & Chest Guard Set | Adidas Headgear (color=Blue) + Adidas Chestguard |

Pricing per bundle = sum of branch prices of its underlying products (uses existing `get_public_accessory_products` for branch overrides).

## Buyer selections (per bundle line)

- **Quantity**: +/- stepper (as today).
- **Gender** (bundles 1 & 2): Male / Female radio → picks the groin guard variant.
- **Size**: required.
  - Guards use one size for the 3 items (XS / S / M / L / XL).
  - Bundles 3 & 4: separate size pickers for Headgear (XS–XL) and Chestguard (Size 1–5).
- Color for bundles 3 & 4 is baked into the bundle name (no extra picker).

A bundle line can only be added to the cart once gender (if applicable) and all required sizes are selected.

## Frontend changes

**New file** `src/constants/accessoryBundles.ts`
- Exports `ACCESSORY_BUNDLES`: array of `{ key, name, components: [{ productId | productIdByGender, sizeOptions, color? }], requiresGender }`.
- Hardcodes product UUIDs verified against the catalog.

**Edit** `src/pages/public/PublicAccessoriesPayment.tsx`
- Stop calling `getPublicAccessoryProducts` for rendering the catalog; still call it (or a slim version) to look up branch prices for the underlying product IDs.
- Replace the product list with 4 bundle cards. Each card: bundle name, computed price, gender radio (if applicable), size selector(s), qty stepper.
- Cart summary shows bundle name × qty and total.
- On submit, expand each cart bundle into per-component `AccessoryItem`s carrying `product_id`, `name` (e.g. "Adidas Headgear (Red) – M"), `qty`, `unit_price`, `line_total`, plus added fields `bundle_key`, `bundle_name`, `size`, `color`. Total $ unchanged.

**Edit** `src/pages/public/PublicAccessoriesList.tsx`
- Group `items[]` by `bundle_key` for display and product filter so each row shows bundle names (e.g. "Adidas Headgear (Red) & Chest Guard Set × 1") instead of 2–3 component rows.
- Product filter dropdown now lists the 4 bundle names + All.

## Backend / DB

No schema migration. The existing `admin_verify_accessory_submission` RPC already builds the combined invoice from `items[].product_id` — because bundles are expanded on submit, every line item still maps to a real product, so the invoice naturally lists the underlying SKUs (with size/color in the description) under the matched student.

`get_public_accessory_products` is kept as-is to source branch-overridden prices, but the UI no longer shows its full list to buyers.

## Out of scope

- Bundle-level discounts (the existing $10 Adidas auto-bundle discount in invoicing still applies separately if its rule matches).
- Stock decrement, editing submitted orders, notifications.
