# Reupload payment proof — everywhere it's missing

Staff can already replace a payment proof on the Grading, Competitions and Seminars tabs (Reupload button in the proof preview). This plan adds the same ability to the places that don't have it yet.

## What changes

1. **School Fees tab** (`src/components/grading-list/SchoolFeesTab.tsx`)
   - Add a "Reupload" button to the payment-proof popup.
   - New service function (mirroring `adminReplaceGradingSubmissionProof`) that uploads the new file to the `payment-proofs` bucket and updates the row's proof. School-fee rows can come from two sources (older fee form submissions and /hello chat payments), so the function updates whichever table the row belongs to.
   - After replacement the popup shows the new file and the list refreshes.

2. **Uniforms & Guards tab** (`src/pages/public/PublicGuardsPurchaseList.tsx`)
   - Add a "Reupload" button to the proof preview popup, same pattern: upload new file, update the purchase row's proof, refresh.

3. **Grading edit-entry dialog** (the dialog in the screenshot — certificate name / student / branch / result / remark / slot)
   - Add a small "Payment proof" row showing the current proof thumbnail with a "Reupload" button, so staff can replace the proof without closing the edit dialog. Uses the existing `adminReplaceGradingSubmissionProof`.

## Rules

- Accepts images and PDFs, same as today.
- The new file replaces the old one — the old file path is no longer referenced by the row.
- Replacing the proof does not change the payment's verification status; if the proof was already scanned, the new file is queued for a fresh amount scan.
- Branch-scoped staff passwords keep working (same permissions as the existing reupload buttons).

## Technical notes

- Reuse the existing upload pattern: `payment-proofs` bucket, signed URL, update `proof_url` on the row.
- New service functions: `adminReplaceSchoolFeesProof` (handles both school-fee sources) and `adminReplaceGuardsProof` in the respective service files.
- No database schema changes; no changes to student portal or /hello.
