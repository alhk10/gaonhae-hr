Add a "Reupload" button in the Payment Proof preview dialog on every tab of `/grading-list` (Grading, Competitions, Seminars), matching the existing certificate reupload UX in `CompetitionsTab` (Upload icon + label, replaces the currently viewed proof, refreshes the list).

## Scope

- Only staff who can already open the preview see the button (same visibility as the existing certificate Reupload — no new role checks).
- Accepts `image/*,application/pdf`, single file, uploads to the `payment-proofs` bucket under the same `public-*` path prefixes the initial submission uses, then updates `proof_url` on the submission row.
- On success: toast "Payment proof replaced", swap the preview to the new signed URL, reset rotation, invalidate the tab's list query.

## Files to change

### 1. `src/services/gradingPaymentSubmissionService.ts` (new helper)
Add `adminReplaceGradingSubmissionProof(submissionId, file, branchId)` mirroring `adminReplaceSeminarSubmissionProof`:
- Build path `public-grading/{branchId}/{ts}_replace_proof.{ext}` (matches existing initial-upload convention).
- Upload to `payment-proofs` bucket (`upsert: false`), create 5-year signed URL.
- Update `grading_payment_submissions.proof_url` where `id = submissionId`, return the new URL.

### 2. `src/pages/public/PublicGradingList.tsx`
- Import the new grading helper.
- Extend `preview` state (currently only competition uses `kind`/`submissionId`/`branchId`) so the shared `preview` dialog at line 2507 also handles `kind: 'proof'` and a `source: 'grading' | 'competition'` discriminator.
- Wire the grading tab's `openLightbox(r.proof_url!)` call (line 1407) to instead call `setPreview({ url, title, kind: 'proof', source: 'grading', submissionId: r.submission_id, branchId: r.branch_id })` when `r.source === 'submission'` (only submissions have a mutable proof; legacy paid rows have none).
- In `CompetitionsTab`, change the proof `Thumb` (line 2398) so its onClick opens the preview with `kind: 'proof', source: 'competition', submissionId, branchId` (extend the `Thumb` props to pass these through for the proof case).
- In the shared preview dialog header, render a second Reupload block when `preview.kind === 'proof'` — same hidden file input pattern as certificate, calling the correct service based on `preview.source`, then `qc.invalidateQueries` for `['public-grading-list']` or `['public-competition-list']`.

### 3. `src/components/grading-list/SeminarsTab.tsx`
- Extend local `preview` state with optional `kind: 'proof'`, `submissionId`, `branchId`.
- Change the proof `Thumb` at line 176 to set that state.
- Add the same Reupload button + hidden input in the preview dialog header, calling `adminReplaceSeminarSubmissionProof(submissionId, file, branchId)`, then invalidate the seminar list query.

## Out of scope

- Guards purchase list (separate page `/guards-purchase-list`).
- Any RLS / storage policy changes — the existing `payment-proofs` policies already allow the staff-side upload/update paths used by the current certificate reupload and initial submission flows.
- No database migration.
