# Fix School Fees: "Paid" should be "Paid & Verified", and show missing proof thumbnails

## What's wrong

1. **Status.** The rows in your screenshot (e.g. INV-202610-0046, -0045, -0044) all have their PayNow payment verified: the screenshot check matched the amount and confirmed it automatically. Their invoices still say "Paid" because the step that moves an invoice to "Paid & Verified" never ran for those automatic confirmations. Across all invoices, 33 are affected. INV-202610-0036 (Duncann Tan, short $10.90) and INV-202610-0030 are correctly still "Paid" because staff haven't checked them yet.
2. **Proof thumbnail.** /hello saves the screenshot as a private file reference, not a viewable link. The School Fees list passes that reference straight to the picture, so nothing shows. Older form payments, which saved a full link, do show.

## Fix

1. Make the invoice update run whenever a payment gets verified, whether by staff or by the automatic screenshot check.
2. Correct the 33 existing invoices to "Paid & Verified". Each change gets logged in the corrections log.
3. Turn each /hello screenshot reference into a temporary viewable link before showing it. This covers the thumbnail, the popup, the scan check and any extra proofs, so every row shows its screenshot.

## Technical notes

- Status cause: `trg_auto_verify_matched_scan` (BEFORE UPDATE OF `proof_scan_status`) sets `verification_status='verified'`. `trg_sync_invoice_status_from_payments` is `AFTER ... UPDATE OF verification_status, amount`. Column-list triggers only fire for columns in the SET clause, so auto-scan verifications never sync.
- Migration: recreate the sync trigger as `AFTER INSERT OR DELETE OR UPDATE ON payments` with no column list. The function already writes only when the status changes.
- Data pass: set `status='verified'` where the invoice is not cancelled or draft, `balance_due <= 0.01` and every payment is verified. Log each change to `status_normalisation_log`.
- Thumbnail: in `getSchoolFeesList` (`schoolFeesSubmissionService.ts`), map `proof_url` and `extra_proofs` through `resolveStorageUrl` from `@/utils/storageUrl`, which already maps `public-hello/` to the `payment-proofs` bucket. If anonymous signing is blocked by storage policy on /access, add a SECURITY DEFINER-backed signing path (edge function using the service role) scoped to payment-proof paths.
- Verify: the count query returns 0; /access School Fees shows "Paid & Verified" and thumbnails for the Oct rows.
