# External invoices: GST inclusive / exclusive toggle

## What changes
- New invoice form gets a "Prices include GST" switch next to the total.
- Default follows the branch country: Singapore off (9% added on top), Australia on (10% already inside the price).
- The total line updates live, e.g. "Total (incl. 9% GST): $130.80" when off, or "Total (GST included): $120.00" when on, with the GST amount shown.
- The saved invoice, PDF and stock use the same choice, so totals always match what staff saw.

## Technical details
- `externalInvoiceTotal(lines, country, inclusive?)` gains an optional inclusive flag (defaults to country rule); add tests for SG exclusive, SG inclusive, AU inclusive, AU exclusive.
- `create_external_invoice` reads optional `p_payload->>'tax_inclusive'`; when present it overrides the country default for `v_incl`. GST rates unchanged.
- `ExternalInvoicesTab.tsx`: Switch state reset to country default when branch changes; sent in the payload.
