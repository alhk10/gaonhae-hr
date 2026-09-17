# Fix "Automatic import failed" on competition payments

## What is happening

Every verified and matched competition payment fails to become an invoice with
`null value in column "product_id"`. Each invoice line must point to a product in the
price list, but the competition import leaves that field empty, so the invoice is rejected.
27 verified competition payments (National Poomsae Championship and Grand Slam Youth) are
currently stuck waiting for this.

## The fix

1. **Give every competition invoice line a product.**
   The import picks the product in this order:
   - the product chosen on the submission itself (15 of the 79 submissions have one), then
   - the product set on the competition event, then
   - a fallback competition product, so the import can never fail again.

2. **Add the fallback product.**
   A single "Competition Registration" product (price 0, inactive in the invoice picker is
   not required — it stays a normal catalogue entry) used only when nothing more specific is
   set. Extra lines (coaching, categories, add-ons) use the same product, keeping their own
   description and amount so the invoice reads exactly as it does today.

3. **Retry the stuck payments.**
   After the fix, the 27 waiting submissions import normally with the existing
   "Import as Invoice" button; nothing else about the approval screen changes.

## Technical notes

- Migration rewriting `public.admin_import_competition_submission`: resolve
  `v_product_id := COALESCE(sub.coaching_product_id, ev.coaching_product_id, <fallback>)`
  where the fallback is looked up by name and created in the same migration if missing;
  raise a clear error only if that lookup somehow returns nothing.
- Both `INSERT INTO public.invoice_items` statements (main line and `extra_lines` loop) use
  `v_product_id` instead of `NULL`.
- No table or column changes; `invoice_items.product_id` stays NOT NULL.
- Other import paths (seminar, grading, school fees, guards) already resolve a product and
  are left untouched; they will be re-checked for the same NULL pattern as part of the change.
