# Class fee discounts and default weeks

## What changes (staff Create/Edit Invoice in /access and dashboard)

1. **Sibling / family discount ($20, Yishun $10) needs 4+ weeks**
   - Applied automatically only when the class line quantity is 4 weeks or more.
   - Recalculated whenever staff change the quantity: drop to 3 weeks removes it, raise to 4 adds it back (e.g. Atahan's 3-week line would lose the $10).
   - Same rule in /hello "Pay school fees" and the database check for /hello invoices.

2. **Default quantity for Classes products = full term weeks**
   - Picking a Classes product with a term fills Qty with that term's lesson weeks (10 or 12, from the term calendar, public holidays excluded). Changing the term updates it. Staff can still edit it.
   - Falls back to 10 if the term's weeks can't be worked out.

3. **Early payment $10 only for full-term, on-time payment**
   - Applies only when the quantity equals the full term's weeks AND the payment is on or before the term start date.
   - Part-term lines never get it; if a later edit reduces weeks, it's removed.

4. **Warning on a manual $10 discount**
   - When staff type a $10 discount on any line, a pop-up explains the rules (full term, paid by term start) and asks "Proceed anyway" or "Cancel". Cancel reverts the discount.

## Technical details
- `src/utils/schoolFeePlan.ts`: add `siblingEligible(qty) = qty >= 4` and `earlyEligible(qty, termWeeks, payDate, termStart)`; unit tests (plain bun script) for 3 vs 4 weeks, 11 vs 12 weeks, paid day after start.
- `InvoiceDialog.tsx`: on product/term selection set quantity from `_term_required_weeks` (via existing term data); move sibling/early auto-discount into a recompute used by `addItem`, quantity and term changes; wrap `updateItemDiscount` / `handleEditItemDiscountChange` with an AlertDialog when value === 10 and type amount.
- `PaySchoolFeesDialog.tsx`, `PublicHelloChat.tsx`, `submit_public_chat_invoice` / `get_public_sibling_discount`: gate sibling on paid weeks >= 4 and early on full-term.
- Existing invoices are not changed.
