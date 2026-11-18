# Limited Edition Products

## What you'll get
1. **"Limited Edition" button** to the left of Settings on the Uniforms & Guards tab in /access.
2. **Limited Edition manager** (works like Competition settings):
   - Add, edit, turn on/off and delete limited edition items.
   - Each item has: name, several images, a description, price per branch country (SG with GST / AU), sizes (for example XS–XL), optional designs/colours, start and end dates and an optional stock limit.
   - Which branches can see it (all or selected).
3. **Pop-up on /hello**: once a student is recognised, active limited edition items show in a pop-up with images and descriptions. Pop-ups follow the existing order (after notices and unpaid invoices) and can be dismissed.
4. **Order**: tapping Order opens a picker where the student chooses design, size and quantity. They can add several lines (different sizes or designs) before checking out.
5. **Payment**: uses the same /hello checkout as now, with credit used first, proof upload, scan and auto-verify on exact amount, and an invoice once verified and matched.
6. **Recorded in Uniforms & Guards**: each order appears in the purchase list with a "Limited Edition" label and filter, its chosen sizes and designs, and the same Collected, Refund and Delete actions.

## Technical details
- New `limited_edition_products` table (name, description, images[], sizes[], designs[], prices per country, branch_ids, active, start/end, stock_limit), with grants and RLS. Writes go through password-gated SECURITY DEFINER RPCs (`_settings_guard`); the public read RPC returns active items only.
- Images go into the existing public product-images bucket, using the same upload path as competition images.
- Each item is backed by a `products` row (category "Limited Edition"), so invoices, GST, credits and refunds reuse the existing logic.
- Orders are saved as `guards_purchases` rows with `variant_selections` (design/size/qty per line) and `source = 'limited_edition'`. The existing auto-verify and auto-invoice triggers apply unchanged.
- /hello: a new popup step and order dialog in `PublicHelloChat.tsx`, which sends to the existing guards submission path with a stable `client_ref`.
- The purchase list gets a "Limited Edition" option in the collection filter.
