## Goal

1. Show per-component variant selectors (size + color where applicable) on each row in `/guardspurchase-list`, right after Status.
2. Block the "Collected" checkbox until status is `verified` AND all required variants are chosen.
3. Carry the chosen size + color through to invoice line items when a Superadmin invoices the order.
4. Send a "thank you" email automatically when `/guards` is submitted.
5. Send a "collected / 7-day exchange" email automatically when Collected is checked.

---

## What gets shown on the list

For each purchased SET we expand to the underlying components and render a compact selector cell:

| Cart item | Components shown | Inputs |
|---|---|---|
| Gaonhae Protection Guard Set | Arm Guard, Shin Guard, Groin Guard (Male/Female chosen by buyer gender) | Size (XS, S, M, L, XL) per component |
| Adidas Chest + Headgear Set | Adidas Chestguard, Adidas Headgear | Chestguard: Size 1–5. Headgear: Size XS–XL + Color (Red / Blue) |

Selections are saved per purchase row in a new `variant_selections` JSONB column keyed by component product id, e.g.
```json
{ "bf2a6538-...": { "size": "M" }, "a403769f-...": { "size": "L", "color": "Red" } }
```

The selectors render inline (compact `h-7 text-xs` dropdowns) in a new column between Status and Collected.

## Collected gating

The Collected checkbox is disabled until:
- `sale_status === 'verified'`, AND
- every required variant for every component of every item in the cart has been filled.

A short helper line ("Select all variants") appears when blocked by missing variants.

## Invoicing carries the variant

`createInvoiceForPurchase` (Superadmin dashboard only) reads `variant_selections` and writes each line with:
- `size_variant` = `"Color / Size"` when color exists, else just `"Size"` (matches the existing `Red / L` convention).
- `metadata.color`, `metadata.size` for downstream filtering.

## Emails

Use the existing Lovable Emails infrastructure (notify.gaonhaetaekwondo.com is verified). Two new transactional templates under `supabase/functions/_shared/transactional-email-templates/`:

1. **`guards-order-received`** — sent from `submitGuardsPurchase` after insert succeeds.
   Subject: "We've received your guards order"
   Body:
   > Thank you for ordering your guards with Gaonhae Taekwondo.
   > We will update you when your guards are ready for collection.

2. **`guards-collected`** — sent from `setGuardsCollected` when `collected` transitions to true.
   Subject: "Your guards have been collected"
   Body:
   > Thank you for ordering your guards with Gaonhae Taekwondo. Your guards have now been collected.
   > Should you need to exchange/refund, you will need to do so within 7 days. Please ensure that the guards are not used and in a resellable condition.
   > Thank you.

Both registered in `registry.ts` and dispatched via `supabase.functions.invoke('send-transactional-email', ...)` using `idempotencyKey = guards-<purpose>-<purchase_id>`. Skipped silently if the buyer has no email on file.

## Technical changes

### Database
- Migration: `ALTER TABLE public.guards_purchases ADD COLUMN variant_selections jsonb NOT NULL DEFAULT '{}'::jsonb;`

### Frontend
- `src/services/guardsPurchaseService.ts`
  - Add `variant_selections` to `GuardsPurchaseRow`, `updateGuardsPurchase` patch type, and the insert row.
  - Add helper `getComponentsForCart(cart, gender)` returning `{ product_id, name, sizes, colors }[]` from `GUARDS_CATALOG` + component id maps.
  - Add helper `isVariantSelectionComplete(cart, gender, selections)`.
  - Update `createInvoiceForPurchase` to set `size_variant` / `metadata` per line from `variant_selections`.
- `src/pages/public/PublicGuardsPurchaseList.tsx`
  - New "Variants" column (between Status and Collected) rendering compact size/color dropdowns per component; saves via `updateGuardsPurchase`.
  - Collected `disabled` and tooltip when variants incomplete or status not verified.
- `src/pages/public/PublicGuardsPurchase.tsx`
  - On submit success, invoke `send-transactional-email` with `guards-order-received` (best-effort; failure does not block success screen).

### Email templates / Edge function
- New `guards-order-received.tsx` and `guards-collected.tsx` templates, white background, brand-matching styling.
- Register both in `registry.ts`.
- Deploy `send-transactional-email`.

## Out of scope
- No changes to public `/guards` UI fields (variants were intentionally postponed until staff selects sizes).
- No bulk superadmin matching UI changes.
