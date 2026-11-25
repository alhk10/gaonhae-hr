# Limited Edition items on staff invoices

## What went wrong (INV-202611-0110, YONG RUI CHENG)
- Staff added the Christmas T-shirt twice in the /access invoice form. Sizes 160 and 140 were saved, but no Black/White choice was asked for, and the PDF shows neither.
- Staff invoices never create an order in Uniforms & Guards. Only /hello orders do, so this one is missing from that tab.
- The total shows S$59.99 instead of S$60.00. The form added GST to the before-GST price of each shirt and rounded it.

## Changes
1. **Invoice form (/access and staff invoice dialog):** when a Limited Edition product is picked, show a Design dropdown (from the product's designs) and a Size dropdown (from its sizes). Both are required before saving.
2. **Line wording:** saved as "Limited Edition - 2026 Limited Edition Christmas T-shirts (Black / 160)". It shows on the invoice screen and PDF.
3. **Price:** Singapore lines use the GST-inclusive price ($30.00), so 2 shirts total exactly S$60.00.
4. **Uniforms & Guards tab:** saving a staff invoice that contains Limited Edition lines also creates a matching order, linked to the invoice, with design, size and quantity. Its status follows the invoice (verified when paid). Staff can collect it like a /hello order. Editing or deleting the invoice updates or removes that order. Stock is reduced once only.
5. **Fix INV-202611-0110:** create its missing Uniforms & Guards order (sizes 160 and 140). Design stays blank until staff choose Black or White by editing the invoice. Correct the total to S$60.00. The S$59.99 payment then leaves 1 cent due, so that cent is written off and the invoice stays paid.
6. Check other staff invoices with Limited Edition lines and fix them the same way.

## Technical details
- Design is stored in `invoice_items.metadata.design`, and size in `size_variant`.
- A database trigger on invoice_items creates and updates `guards_purchases` rows keyed `le:<id>:<design>:<size>`, with `invoice_id` set. It skips invoices already linked to a /hello order, so nothing is duplicated.
- Tests check that `le` line totals equal inclusive price × quantity.
