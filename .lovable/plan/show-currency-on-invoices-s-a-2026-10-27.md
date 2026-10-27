# Show currency on invoices (S$ / A$)

## What you'll see
Every invoice amount uses its branch's country:
- Singapore branches: **S$290.00**
- Australia (Morley): **A$290.00**

Applies to:
- Invoice PDF (line items, subtotal, GST, discount, total, paid, refunded, balance, WhatsApp share text).
- Invoice details popup.
- Invoice lists in `/access` (External Invoices, School Fees, Studio Rental, Summary invoice rows, student profile invoice list).
- `/hello` outstanding invoices popup, pay-all totals and credit amounts.

## Technical details
- Add `currencyForCountry(country)` in `currencyUtils.ts` (Australia → AUD, else SGD) and make display use `formatCurrencySimple` so output is always `S$` / `A$` (Intl en-SG otherwise prints plain `$`).
- `invoicePDFGenerator.ts`: replace local `$` formatter with the branch-country currency already resolved for template selection.
- Invoice list RPCs that lack branch country (e.g. `list_external_invoices`, `/hello` invoice list): return `branch_country` so the UI can pick the symbol; lists that already join branches reuse it.
- Small unit test: Australia → `A$`, Singapore/unknown → `S$`.
