# Show Australian invoices' payments in A$

## Problem
INV-202611-0197 (POON TKD, Morley) prints in A$, but the Payments box under it shows "Paid S$0.00 / Balance due S$385.00". The Record Payment dialog may also default to Singapore settings (PayNow, S$).

Morley is saved as an Australia branch. The PDF gets its currency from the invoice's template country (AU). The Payments box and Record Payment dialog look only at the invoice's branch details, which aren't loaded for external (school/club) invoices, so they fall back to S$.

## Fix
- Work out the invoice's country once in the invoice view: branch country, then the invoice template country (AU/SG), then the branch's own country.
- Use that one value for the Payments box currency and for the Record Payment dialog (A$, no PayNow default for Australia).
- Check other places that show payment amounts for an invoice (payment list, shortage list) use the same rule.

## Check
- Open INV-202611-0197: the Payments box shows A$0.00 / A$385.00, and Record Payment shows A$.
- A Singapore invoice still shows S$.

## Technical details
- `src/components/grading-list/InvoiceDetailDialog.tsx`: compute `country` from `detail.branch?.country || detail.branch_country || detail.template?.country`, normalised so 'AU'/'Australia' map to A$. Pass it to `InvoicePaymentsList` and `AccessRecordPaymentDialog`.
- No data changes; the amounts are already stored correctly, only the currency label is wrong.
