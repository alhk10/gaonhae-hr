## Add Reupload button to the certificate preview dialog

Small enhancement to the shared preview `Dialog` inside `CompetitionsTab` in `src/pages/public/PublicGradingList.tsx`. The page is already behind the admin unlock password, so no extra gate is needed.

### Changes

1. **Extend preview state** — change `preview` from `{ url, title }` to `{ url, title, kind?, submissionId?, branchId? }`. Only certificate opens pass `kind: 'certificate'` (plus `submissionId` and `branchId`) so the Reupload button appears only there and knows what to patch. Other openers (proof, signature, indemnity, passport, photo) are unchanged.

2. **Update the certificate `Thumb`** at line 2324 to pass the extra fields:
   ```
   <Thumb url={r.certificate_url}
          title={`${r.student_name} — Certificate`}
          kind="certificate"
          submissionId={r.submission_id}
          branchId={r.branch_id} />
   ```
   `Thumb` gains optional props and forwards them into `setPreview`.

3. **Add a Reupload control** to the preview `DialogHeader` (line 2467), rendered only when `preview.kind === 'certificate'`:
   - Hidden `<input type="file" accept="image/*,application/pdf">` triggered by a small `Button` with an `Upload` icon (label "Reupload").
   - On file pick: call `adminReplaceCompetitionSubmissionFile(submissionId, 'certificate', file, branchId)` (already exists in `competitionPaymentSubmissionService.ts`).
   - Show a `busy` state on the button while uploading; on success: toast, `qc.invalidateQueries({ queryKey: ['public-competition-list'] })`, update `preview.url` to the new signed URL so the new image renders immediately, and reset rotation.
   - On failure: toast the error message.

4. **Out of scope** — proof/signature/other docs (only the certificate preview per the request), grading tab certificates, storage/RLS/service changes, bulk reupload.

### Files touched
- `src/pages/public/PublicGradingList.tsx` (only)
