# Round GST down to the nearest cent

## Problem
On S$382.50, 9% GST is S$34.425. Some parts of the app round this up to S$34.43 and others show S$34.42. Paying the S$416.93 shown on screen can then trigger a "Payment exceeds the invoice total by $0.00" warning, and it can leave tiny credits or balances.

## Change
- GST is always rounded **down** to the cent. Example: S$34.425 becomes S$34.42, so the total is S$416.92 on screen, on the PDF, in /hello and in the database.
- Tax-included (Australia) prices work the same way: the GST included is rounded down, and the total stays the price.
- The overpayment and underpayment checks compare whole cents. A difference under 1 cent never triggers the warning or creates a credit.
- Existing invoices are not recalculated unless they are edited.

## Technical details
- `src/utils/invoiceTotals.ts`: replace `r2` for tax with `floor2 = n => Math.floor(n*100 + 1e-6)/100` (the epsilon stops float errors such as 34.42499999 → 34.41). Update its test.
- Search `src/` for other GST calculations (`* GST_RATE`, `tax_rate`, PublicHelloChat, ExternalInvoicesTab, rental quote, Perth comp, guards) and route them through `computeInvoiceTotals`.
- `InvoiceDialog.tsx` line 1142 and similar checks: compare `Math.round(amt*100) > Math.round(total*100)`.
- Migration: redefine the current DB functions that compute tax (invoice totals/recalc, line tax, public invoice creators, rental quote) to use `floor(x*100 + 0.000001)/100` in place of `round(x,2)` for tax.
