# 1-week class lines use the Ad-Hoc Lesson price

## What changes
- On any class fee line (e.g. "Foundation to Red 1x Weekend"), when Qty is set to **1 week**, the price automatically switches to the **Ad-Hoc Lesson** price for that branch (currently $27.00 per lesson; branch price rules apply).
  - 1x per week line: 1 week = 1 lesson = $27.00.
  - 2x per week line: 1 week = 2 lessons = $54.00 (shown as unit price $54.00).
- Changing Qty back to 2+ weeks restores the normal weekly price.
- Staff can still type a different price on a 1-week line. When they do, a short confirm box explains the ad-hoc rule; confirming keeps their price and records an alert.
- The alert appears in the existing **Discount / price overrides** card on the Superadmin dashboard and on the /access Summary tab for the all-branch password (Hp97533488). It shows student, branch, term, product, the price used vs the ad-hoc price, and who entered it.
- Works the same in every place invoices are created (signed-in superadmin, branch passwords, Students tab, student profile, conversions).

## Not changing
- Existing invoices, 2+ week pricing, sibling/early discounts, ad-hoc lesson product itself.

## Technical details
- `src/utils/schoolFeePlan.ts`: add `adHocWeekPrice(lessonsPerWeek, adHocUnitPrice)` and `isOneWeekClassLine(item)`; unit tests in the existing test file (1x → 27, 2x → 54, qty 2 → normal price).
- `src/components/sales/InvoiceDialog.tsx`: resolve the Ad-Hoc Lesson product price for the selected branch (price_rules override, else base_price) from loaded products/catalogue; apply on qty change / product add for Classes-category term lines; track `price_manual` per line; on manual price ≠ ad-hoc price for a 1-week line, confirm then call existing `log_discount_override` with reason "1-week class price override (ad-hoc price $X)" and amount = difference.
- Reuse `invoice_discount_override_log` + `DiscountOverridesList` (already on Superadmin dashboard and /access Summary), so no new table.
