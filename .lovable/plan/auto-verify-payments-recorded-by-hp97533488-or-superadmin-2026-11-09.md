# Auto-verify payments recorded by Hp97533488 or superadmin

## What changes
- Payments recorded in /access while unlocked with the all-branch password (Hp97533488) are saved as **verified** straight away, for every method (PayNow, bank transfer, card, cash). This applies to regular and external invoices.
- Payments recorded by a signed-in superadmin are also saved as verified.
- Branch passwords keep the current rules: only cash is auto-verified; everything else waits for staff to verify.
- The invoice updates to Paid & Verified as soon as the payment covers it.
- Payments that customers send through /hello are not affected.

## Existing pending payments
The three Morley bank transfers in your screenshot (Leah Giam, Louis Hill, Iqraa Jafarsadiq) carry no record of who entered them, so they stay pending and need **Verify** clicked once.

## Technical details
- `access_record_payment` and `record_external_invoice_payment`: `v_auto := v_cash OR _scope_has(all-branch)`; use it for verification_status / verified_by / verified_at, and add a note "Auto-verified (all-branch)".
- New BEFORE INSERT trigger on `payments`: when `auth.uid()` belongs to a superadmin (existing superadmin check), set verification_status='verified', verified_by/verified_at; the existing sync trigger then recalculates the invoice.
- Toast in Record Payment dialogs reads "Payment recorded and verified" when auto-verified.
