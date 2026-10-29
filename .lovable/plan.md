# Payment shortage approvals

## What happened (confirmed)
NUR ISLAH SHAHREZ SHAH paid invoice INV-202610-0204 through /hello. The invoice is S$501.40, but the scanned PayNow proof shows S$449.55, so she is S$51.85 short. The payment was still saved as S$501.40, so the invoice shows **paid** even though staff haven't verified it. The scan flagged the mismatch, but no screen shows it.

## What will change
1. **New "Payment shortage" approvals.** Any payment whose scanned proof amount is lower than the amount recorded shows up under Approvals in:
   - the superadmin dashboard
   - the /access Summary approvals list (oldest first, scoped to the branch password)
   Each row shows the student, invoice, amount expected, amount scanned, shortfall and the proof image.
2. **Actions on each row:**
   - **Accept scanned amount** — changes the payment to the scanned amount. The invoice becomes partially paid with the remaining balance owing.
   - **Confirm full amount** — staff checked the proof and the full amount was paid (for example, the scan misread it). Verifies as-is.
   - **Reject** — uses the existing payment reject flow.
3. **Invoice status during a shortage.** While a shortage payment is unresolved, its invoice shows **partially paid** instead of paid. The full amount is not counted until staff confirm it.
4. **Fix Nur Islah now.** Her invoice becomes partially paid with S$51.85 outstanding, and her payment appears in the new approvals list.

## Technical details
- Detect the shortage with `proof_scan_status = 'mismatch'`, `proof_scan_amount < amount`, and `verification_status = 'pending'`.
- Update `recalc_invoice_from_payments` so an unresolved shortage payment only counts its `proof_scan_amount`.
- New password-gated RPCs: `access_list_payment_shortages` (uses the `_access_scope` branch filter) and `access_resolve_payment_shortage(action)`. The superadmin dashboard calls the same resolve function through its authenticated path, using a `has_role`-style superadmin check.
- Add the rows to the Summary tab's approvals feed and to the superadmin approval sections.
