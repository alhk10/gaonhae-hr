# Payment shortage approvals

## What happened (confirmed)
NUR ISLAH SHAHREZ SHAH paid invoice INV-202610-0204 through /hello. The invoice is S$501.40, but the scanned PayNow proof shows S$449.55, so she is S$51.85 short. The payment was still saved as S$501.40, so the invoice shows **paid** even though staff haven't verified it. The scan flagged the mismatch, but no screen shows it.

## What will change
1. **New "Payment shortage" approvals.** Any payment whose scanned proof amount is lower than the amount recorded shows up under Approvals in:
   - the superadmin dashboard
   - the /access Summary approvals list (oldest first, scoped to the branch password)
   Each row shows the student, invoice, amount expected, amount scanned, shortfall and the proof image.
2. **Only superadmin can approve.** On the superadmin dashboard, each row has:
   - **Accept scanned amount** — changes the payment to the scanned amount. The invoice becomes partially paid with the remaining balance owing.
   - **Confirm full amount** — superadmin checked the proof and the full amount was paid (for example, the scan misread it).
   - **Reject** — uses the existing payment reject flow.
3. **Record Payment for the balance.** In /access Summary, each shortage row is view-only and has a **Record Payment** button for the second payment, which uses the existing Record Payment dialog. The superadmin dashboard and /hello outstanding invoices also show the remaining balance so it can be paid. The student can pay the balance through the normal /hello outstanding-invoice popup.
4. **Invoice status during a shortage.** While a shortage payment is unresolved, its invoice shows **partially paid** instead of paid. Only the scanned amount counts until superadmin confirms the full amount.
5. **Fix Nur Islah now.** Her invoice becomes partially paid with S$51.85 outstanding, and her payment appears in the new approvals lists.

## Technical details
- Detect the shortage with `proof_scan_status = 'mismatch'`, `proof_scan_amount < amount`, and `verification_status = 'pending'`.
- Update `recalc_invoice_from_payments` so an unresolved shortage payment only counts its `proof_scan_amount`. The second payment then brings the balance to zero.
- `access_list_payment_shortages` is password-gated and branch-scoped with `_access_scope`, and is read-only. `admin_resolve_payment_shortage(action)` is superadmin-only and checked on the server; no /access password can resolve a shortage.
- The Summary rows reuse `AccessRecordPaymentDialog` (`access_record_payment`), which caps the payment at the remaining balance.
