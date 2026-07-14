## Goal
Make the Certificate and Grading Card columns in the Competitions list behave the same: click the column → dialog with an enlarged image and an Upload/Reupload button. Keep the two existing dialogs separate but match their feature sets.

## Certificate column (mirror the "upload from empty" behavior)
File: `src/pages/public/PublicGradingList.tsx`

- Today: `Thumb` renders `—` when `certificate_url` is null, so there is no way to upload from the column.
- Change: when `certificate_url` is null, render a clickable placeholder (green `Upload` icon button, same size as `IdCard` used by grading card) that opens the existing preview dialog in "empty" mode — i.e. no image, only the Reupload button (relabelled to "Upload" when empty).
- Extend the `preview` state to allow `url: string | null` and render the enlarged-image area as an empty placeholder ("No certificate uploaded yet") when null.
- The Reupload button block (lines ~2481–2523) already handles the file input and calls `adminReplaceCompetitionSubmissionFile(..., 'certificate', ...)`. Reuse it — it works for both first upload and reupload. Toast copy switches to "Certificate uploaded" when the previous URL was null.

## Grading Card dialog (add enlarged image preview + per-file reupload)
File: `src/components/grading-list/GradingCardUploadDialog.tsx`

- Replace the plain "Grading card N" text links in the "Already uploaded" list with a thumbnail grid using `SignedImage` (same component the certificate preview uses). PDF entries keep an icon tile.
- Click a thumbnail → open an inner enlarged preview (reuse the same pattern as the certificate preview dialog: max-w-3xl content, rotate button, `SignedImage` at `max-h-[80vh] object-contain`). Implement as local state inside this dialog (`enlarged: { url, index } | null`) rendered via a nested `Dialog`, so the upload dialog stays open behind it.
- In the enlarged view, add a "Reupload" button that:
  - Opens a file picker (image or PDF).
  - Calls a new service `adminReplaceCompetitionGradingCardAt(submissionId, index, file, branchId)` that uploads the new file to the grading card storage path, then calls `adminSetCompetitionGradingCards` with the array where entry `index` is swapped for the new URL.
  - On success: toast, call `onUploaded?.()`, update `enlarged.url` locally so the preview refreshes.
- Keep the existing Trash button on each row for removal, and keep "Add files" for adding up to the `MAX_FILES = 2` cap.

## Service additions
File: `src/services/competitionPaymentSubmissionService.ts`

- Add `adminReplaceCompetitionGradingCardAt(submissionId, index, file, branchId)`:
  1. Upload `file` using the same storage path/prefix already used by `adminUploadCompetitionGradingCards` (reuse the internal helper or inline the same logic).
  2. Fetch the current `grading_card_urls` for `submissionId`.
  3. Replace entry at `index` with the new URL.
  4. Call `adminSetCompetitionGradingCards(submissionId, nextUrls)`.
  5. Return the new URL.

## Out of scope
- No structural merge of the two dialogs.
- No changes to grading list rows outside the two columns and their dialogs.
- No password/auth changes (already removed).
