# Merge payment shortages into the approval list

## What changes in /access Summary (For Action)
- A payment whose scanned proof is less than the amount recorded no longer appears twice (once in approvals with Verify/Reject and again under Payment shortages). It shows **once**, in the main approval list, with a red **Short S$x.xx** badge.
- For branch staff and Hp97533488, that row shows **Upload & record balance** instead of Verify/Reject. It opens the Record Payment dialog, pre-filled with the short amount, so they can upload the extra proof (paste works).
- After saving, the new proof is scanned automatically. If the scanned amounts of all payments add up to the invoice total, both payments are verified and the invoice becomes Paid & Verified. The row then leaves the list.
- If the scan doesn't match, the row stays with the updated shortfall.
- The separate "Payment shortages" card is removed from /access. The superadmin dashboard keeps its Accept scanned / Confirm full / Reject options for tiny shortfalls such as S$0.04.

## Current examples
- Kai Randhawa (short S$0.04), Zhan Ming Yong (S$0.04), Nur Islah Shahrez Shah (S$51.85).

## Technical details
- `SummaryTab.tsx`: load `access_list_payment_shortages`, key by invoice/payment id; for matching School Fees approval rows pass `shortfall` to `SummaryApprovalRow`; drop `<PaymentShortageList mode="access">`.
- `SummaryApprovalRow.tsx`: when `shortfall > 0`, render the Short badge and an **Upload & record balance** button opening `AccessRecordPaymentDialog` (new optional `defaultAmount` prop), instead of Verify/Reject.
- `AccessRecordPaymentDialog.tsx`: after `access_record_payment` succeeds with a proof, call the `scan-payment-proof` edge function with the new `payment_ids`. The existing payments trigger (`_auto_verify_invoice_payments`) then verifies the whole set when scanned totals match to the cent. Branch-password access to the scan uses the same password check as the dialog.
- All-branch recordings are already auto-verified, so for them the shortfall clears as soon as the balance is recorded.
