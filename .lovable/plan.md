# Auto-verify existing pending payments that meet the current rules

## Rule (unchanged, now applied to old records too)
A pending payment is verified automatically when:
- the invoice's counted payments (scanned amounts) add up exactly to the invoice total, to the cent, and
- every pending non-cash payment on that invoice has a proof image attached.

Payments without a proof image stay pending, as you chose.

## What happens
1. Run the existing automatic check once across every invoice that still has pending payments.
2. Invoices that pass become Paid & Verified; their pending payments are marked verified.
3. Everything else stays in For Action for staff.

## Current data (checked)
- 39 invoices have pending payments.
- 36 of these add up exactly, but none of their pending payments has a proof image, so they stay pending.
- So this one-off run is expected to verify 0 invoices today. It is still worth running so the "proof required" condition is enforced from now on.

## Technical details
- Update `_auto_verify_invoice_payments` so it skips invoices where any pending non-cash payment has no `proof_of_payment_url`. Payments from all-branch staff and superadmin are already saved as verified, so this doesn't affect them.
- One-off: `SELECT _auto_verify_invoice_payments(id)` for each invoice with pending payments, then `recalc_invoice_from_payments`, and report how many changed.
