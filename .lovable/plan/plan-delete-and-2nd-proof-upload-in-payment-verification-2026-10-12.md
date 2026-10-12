# Plan: Delete and 2nd proof upload in Payment Verification

## Goal
On the superadmin Payment Verification cards, add a **Delete** button (for wrong or duplicate payments) and an **Add Proof** button (upload a second payment screenshot), so cases like the two JIA HANG ZOU rows sharing one $460 screenshot can be cleaned up without leaving the dashboard.

## Changes

### 1. Delete button (`src/components/dashboard/PaymentVerificationApprovals.tsx`)
- New red-outline **Delete** button per row, opening a confirm dialog that shows the invoice number, student, amount and requires a short reason.
- On confirm, calls the existing `deletePayment(paymentId)` from `paymentService.ts`, which already removes the payment, recalculates the invoice's amount paid / balance / status, logs the change, and voids the accounting journal.
- If the deleted payment is (or is linked to) a credit payment, call the existing `release_credit_hold` RPC first so held credits return to the student.
- If the payment was the invoice's only payment and the whole invoice is a duplicate, the dialog notes that the invoice itself can then be deleted from the Edit Invoice dialog (existing capability for unpaid drafts).
- Deleting refreshes the verification list.

### 2. Add 2nd payment proof
- New **Add Proof** button per row, opening a small dialog with an image file picker (image/* only, PDFs rejected) and an optional "amount on this screenshot" field.
- Uploads to the private `payment-proofs` bucket under `verification/<invoice_id>/extra_<timestamp>.<ext>` with `upsert: false` (same pattern as the school-fees extra proof upload, which works for anonymous/public flows).
- Appends `{ url, amount, uploaded_at }` to the existing `payments.extra_proofs` JSON column (already present in the schema and already rendered as extra thumbnails in Invoice Action Approvals).
- The card shows a "+N" badge when extra proofs exist; the main proof and verification status are unchanged.

## Technical notes
- No schema changes needed: `payments.extra_proofs` already exists; `deletePayment` and `release_credit_hold` already exist.
- This section is superadmin-only and authenticated, so direct deletes are allowed — no approval request needed (the approval workflow exists for non-superadmin staff).
- Storage upload uses the anon client like the school-fees flow; if RLS blocks it, reuse the same `public-fees/...` path prefix that already works.

## Verification
- Typecheck + build.
- Delete a test pending payment and confirm the invoice totals/status recalculate and the row disappears.
- Upload a second proof and confirm it appears as a thumbnail and in Invoice Action Approvals.
