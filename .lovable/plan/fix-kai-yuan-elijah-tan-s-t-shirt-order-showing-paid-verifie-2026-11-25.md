# Fix Kai Yuan Elijah Tan's T-shirt order showing "Paid & Verified" with no invoice

## What happened
- On 25/11 the family ordered 1 White / 150 Christmas T-shirt on /hello (order GP2611254285) and paid S$30 by PayNow. The proof check read S$30 and the order was matched to Kai Yuan.
- It didn't invoice itself automatically. The automatic invoicing only runs when staff change the status directly, and not when the proof check sets it.
- Staff then pressed Verify, which created invoice **INV-2026-00623** (S$30, paid). But two things went wrong:
  1. Linking the invoice back to the order was silently refused, so the order you're looking at still shows no invoice.
  2. The new "staff invoice → Uniforms & Guards order" step (added for invoice 0110) saw a T-shirt invoice with no linked order and made a **second** order for the same shirt.
- So the family was charged once, but the list shows the shirt twice: once with no invoice, once as "Staff invoice".

## Fix this order
- Link GP2611254285 to INV-2026-00623.
- Remove the duplicate "Staff invoice" order for that invoice.
- No change to the invoice or the S$30 paid.

## Stop it happening again
- **Auto-invoice after the proof check:** run automatic invoicing whenever an order becomes verified, including when the proof check sets it. That way matched, exact-amount Limited Edition orders get their invoice straight away.
- **Staff Verify:** the invoice link is saved on the server in the same step that creates the invoice. Any failure shows an error and isn't hidden.
- **No duplicate orders:** an invoice created from an existing order never gets a second "Staff invoice" order.
- I checked every other verified Limited Edition order: this is the only one without an invoice.

## Technical details
- Trigger `trg_guards_auto_invoice` is `AFTER UPDATE OF sale_status`. That doesn't fire when `sale_status` is changed by the BEFORE trigger `_auto_verify_scanned_submission` (from `proof_scan_amount` updates). Change it to `AFTER INSERT OR UPDATE`; the function already checks `OLD.sale_status`.
- `_le_sync_invoice` / its items trigger: skip when the invoice `notes` match `Created from guards purchase <ref>`, and link that purchase (`invoice_id`) instead.
- `guardsPurchaseService.ts` (staff verify): check the error on the `guards_purchases` update. Rely on the server-side link above so branch-password staff (who RLS blocks) still link.
- Data: update `guards_purchases` 662e7fb0… `invoice_id` = 26ef88c2…; delete 208555d2… (notes 'Staff invoice').
