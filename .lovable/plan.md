# Scan every payment proof automatically when it is submitted

## What changes
1. **/hello outstanding-invoice popup (single and Pay-all).** The screenshot is already read on upload. Now the result is saved to each payment it creates when the parent submits. If the amount matches, the payment verifies itself under the existing rules.
2. **/access Create/Edit Invoice payment (staff upload).** When staff attach a proof for a non-cash payment, it is scanned against the payment amount on save and the result is stored. Matching proofs auto-verify. Mismatches show the "Screenshot shows $X" note in Payment Verification.
3. **Payments already waiting.** Payment Verification gets a one-time catch-up: any pending non-cash payment with a proof but no scan result is scanned in the background when the list opens. Matches verify; others stay for review with the scan note. This clears INV-202610-0145, INV-202610-0112 and similar ones.

Auto-verify rules are unchanged: proof attached, not cash/credit, amount matches, not already rejected.

## Technical details
- `PublicHelloChat.tsx`: after the outstanding-invoice payment RPC succeeds, call `recordProofScanForInvoice(sessionId, invoiceId, await payInvScan.waitForResult())` for each paid invoice.
- `InvoiceDialog.tsx`: after the proof upload and payment insert, run the existing `scan-payment-proof` function with the payment amount, then save through a new staff-only RPC `record_proof_scan_for_payment(p_payment_id, status, amount, details)`. It is SECURITY DEFINER, checks staff access, and only writes when no scan exists yet. The existing trigger then auto-verifies.
- `PaymentVerificationApprovals.tsx`: for pending rows with a proof and a null `proof_scan_status`, scan up to a few at a time (signed URL, then scan function, then the same RPC) and refresh the list after.
- Scanning never blocks saving; failures are recorded as unreadable or skipped.
