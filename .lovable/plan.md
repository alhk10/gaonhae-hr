# Fix GST on invoices

## What is wrong today

Two separate problems were confirmed in the database:

1. **660 paid Singapore invoices** (28 May – 19 Sep 2026, $82,033 in total) show GST of $0.00 — including the competition invoice INV-202609-0288 in your screenshot.
2. **New invoices created from public payment pages** (school fees, grading, competition, seminar, uniforms and guards) treat the amount collected as already containing GST. That is why a $420 invoice created today shows $385.32 + $34.68 GST instead of $420 + $37.80 = $457.80.

Invoices created by staff inside the app already add 9% on top correctly. Only the public payment paths and the automatic database rule are wrong.

## What will change

**Past invoices — keep the amount, show the GST inside it**

For the 660 affected invoices the total the parent paid stays exactly the same; the GST portion is simply shown. For example INV-202609-0288 stays at $175.00, and becomes $160.55 + $14.45 GST. Nothing becomes owing, and the invoice PDFs will show the GST line correctly from then on.

Only Singapore branches are affected (no other country has invoices missing GST).

**All new invoices — GST added on top**

From the change onward, every new invoice adds 9% on top of the prices, on every route:

- School fees (including /hello), grading, competition, seminar, uniforms and guards
- Staff-created invoices (already correct, left as is)

On the public payment pages parents will see the GST line and the higher amount to pay before they submit, so the amount they transfer matches the invoice. A $175 competition fee becomes $175.00 + $15.75 GST = $190.75.

**Cut-off**

Invoices already in the system keep their current totals. Only invoices created after this change collect GST on top.

## Technical notes

- `tg_invoices_gst` and `tg_invoice_items_gst` currently back-calculate GST out of `total_amount`. They will be rewritten to add tax on top of the line totals when a branch is GST-registered, using `gst_rate_for_branch`, and to leave rows alone when the caller already supplied a tax amount.
- The public/import RPCs (`admin_verify_*`, `admin_match_*`, `admin_import_*` for grading, competition, seminar, school fees and guards, plus the /hello submission paths) insert `tax_amount = 0` and a total equal to the amount collected. Each will compute the GST-exclusive subtotal, tax and grossed-up total, and set the collected amount as `amount_paid` so any shortfall shows as a balance rather than silently disappearing.
- Public payment front-ends (`PublicSchoolFeesPayment`, `PublicGradingPayment`, `PublicCompetitionPayment`, `PublicSeminarPayment`, `PublicGuardsPurchase`, `PublicHelloChat`) will display a subtotal / GST / total breakdown and submit the grossed-up amount, using a single shared helper so the rate lives in one place.
- Backfill migration: for invoices with `tax_amount = 0`, `total_amount > 0`, created before the cut-off, at a Singapore branch — set `tax_amount = round(total/1.09 * 0.09, 2)` and `subtotal = total - tax`, and apply the matching split to their `invoice_items`. Totals, payments and statuses are untouched.
- Invoice UI and PDF already render a dynamic `GST (x%)` line from the stored values, so no change is needed there.

## Verification

- Re-query the invoices table to confirm no Singapore invoice is left with zero GST and that every backfilled total is unchanged.
- Create a test invoice on each public route and confirm the total equals price + 9%.
