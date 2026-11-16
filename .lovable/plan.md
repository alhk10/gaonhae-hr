# Round GST up to the nearest cent (replaces round-down)

## Change
- GST is always rounded **up** to the cent. Example: on S$382.50, 9% GST is S$34.425, which becomes S$34.43, so the total is S$416.93. That is the same everywhere: on screen, on the PDF, in /hello and on the saved invoice.
- Tax-included (Australia) prices: the GST included is rounded up, and the total stays the price.
- Payment checks compare whole cents, so paying exactly the total never shows "exceeds by $0.00" or creates a credit.
- Existing invoices are not recalculated unless they are edited.

## Technical details
- Rename the shared helper `taxFloor` → `taxRound` in `src/utils/invoiceTotals.ts`, using `Math.ceil(n*100 - 1e-6)/100`. The epsilon keeps exact cents from going up (41.4 stays 41.40). Update all imports and uses (InvoiceDialog, invoiceService, PublicHelloChat, PublicSeminarPayment, guardsPurchaseService, CompetitionRegistrationForm, externalInvoiceTotal).
- Keep the whole-cent comparison in the InvoiceDialog overpayment check.
- Migration: change DB helper `_tax_floor` to `ceil(x*100 - 0.000001)/100`. It is already used by the chat invoice, rental quote/invoice and public amount functions, so only its body changes.
- Add test cases to `invoiceTotals.test.ts` (382.50 at 9% → tax 34.43, total 416.93) and run it.
