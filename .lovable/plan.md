## Problem

In `Superadmin Dashboard → Payment Verification`, payment proof images render broken (alt text shown). The `payment-proofs` storage bucket is **private**, but `PaymentVerificationApprovals.tsx` uses the raw `payment.proof_of_payment_url` directly as `<img src>` and as the `<a href>` — so the public URL 404s.

The project already has the right helpers for this case: `SignedImage` and `SignedLink` from `@/components/common/SignedMedia`, which resolve a stored URL into a short-lived signed URL.

## Fix

In `src/components/dashboard/PaymentVerificationApprovals.tsx` (lines ~223–234):
- Replace the raw `<a href={payment.proof_of_payment_url}>` with `<SignedLink href={payment.proof_of_payment_url} target="_blank" ...>`.
- Replace the raw `<img src={payment.proof_of_payment_url}>` with `<SignedImage src={payment.proof_of_payment_url} fallback={<div className="...">Payment proof</div>} ... />`.
- Add the import: `import { SignedImage, SignedLink } from '@/components/common/SignedMedia';`.

No other files change. No DB or RLS changes (bucket stays private; signed URLs are the intended access path).

## Out of scope
No layout changes; no other proof-rendering surfaces touched in this pass (they may already use SignedImage; can audit separately if needed).
