# Fix: Proof of payment not showing (grading-list + payment verification)

## Root cause

For Caleb Lee and Charlotte Lee, the `grading_payment_submissions.proof_url` column holds a bare path:

```
public-grading/kembangan/1779799060215_CALEB_LEE.jpeg
```

not a full URL. This happens because `submitGradingPayments` in `src/services/gradingPaymentSubmissionService.ts` uploads the file to the **`payment-proofs`** bucket under that path, then tries to create a long-lived signed URL — when that call returns empty it falls back to storing just the raw `path` (line 450: `const proofUrl = signed?.signedUrl ?? path;`). The same shape exists for the competition submissions service.

When the UI renders these (`/grading-list` row thumbnails, lightbox, and the Superadmin "Public Grading / Competition Submission Approvals" cards) it goes through `SignedImage` → `resolveStorageUrl()` in `src/utils/storageUrl.ts`. That helper only recognises:

- old public-format URLs (`/storage/v1/object/public/<bucket>/<path>`)
- already-signed URLs

A bare path like `public-grading/...` matches nothing, so the resolver returns the string unchanged. `<img src="public-grading/...">` resolves against the app origin and fails — the thumbnail/lightbox/approval card all show nothing.

The `PaymentVerificationApprovals` screen reads a different column (`payments.proof_of_payment_url`) which is already a public URL, so the breakage there is specifically about the public submission cards living alongside it on the Superadmin dashboard.

## Fix

Single, surgical change in `src/utils/storageUrl.ts`:

1. Extend `parseStoragePath()` so that when the input is not a URL, it's treated as a bare path inside the `payment-proofs` bucket when it starts with one of the public submission prefixes:
   - `public-grading/`
   - `public-competition/`
   - `public-guards/`
2. With `payment-proofs` already in `PRIVATE_BUCKETS`, the existing `createSignedUrl(path, 1h)` flow then produces a working signed URL on every render.

No DB migration, no backfill — existing pending rows render correctly as soon as the resolver is updated. New uploads continue to store the bare path; the resolver handles them on read.

## Verification

After the change, on `/grading-list` (Grading tab) and on the Superadmin "Public Grading Submission Approvals" and "Public Competition Submission Approvals" cards, the proof thumbnails and lightbox image for Caleb Lee and Charlotte Lee load correctly. No other call sites are affected because the resolver only adds a new recognition rule.

## Out of scope

- No changes to the upload services, the submissions tables, RLS, or the Superadmin payment verification (`payments.proof_of_payment_url`) flow.
- Not changing the 5-year signed-URL fallback in the upload services; the on-demand resolver makes that fallback unnecessary for display.
