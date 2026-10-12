# Show extra payment proofs in the verification card

## Problem
On the superadmin Dashboard → Payment Verification cards, additional payment proofs (uploaded via **Add Proof**) are shown only as a `+1 extra proof` badge. Staff cannot view the images or their amounts, so a duplicate-looking proof cannot be inspected before Verify/Reject.

Other areas already display extra proofs (Invoice Action Approvals thumbnails, School Fees proof popup) — only the Payment Verification card needs the fix.

## Change
`src/components/dashboard/PaymentVerificationApprovals.tsx` only:

1. Make the `+N extra proof(s)` badge a clickable button.
2. Add a dialog that lists each extra proof for the selected payment:
   - Signed thumbnail of the proof (using `SignedImage`), clickable to open the full-size signed URL in a new tab.
   - Amount recorded when the proof was uploaded (or "no amount entered") and upload date, formatted as DD/MM/YYYY.
3. Keep the existing badge styling but add hover/cursor affordance.

## Verification
- Typecheck and build pass.
- No database or storage changes; extra proofs already live in `payments.extra_proofs` as `{url, amount, uploaded_at}`.
