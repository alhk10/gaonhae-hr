# Paste grading cards into the upload box

## What changes
In the "Upload grading card" box (staff Competition list), staff can paste an image with Ctrl+V / Cmd+V, as well as using "Add files".
- Pasting a screenshot or copied image adds it to the list, the same as picking a file. It still counts towards the "0 of 2 files" limit and the same file-type checks apply.
- A short hint under the button: "or paste an image (Ctrl+V)".
- Pasting also works in the replace-file view of the same box.
- Pasted images get a readable name (e.g. `grading-card-pasted-1.png`) so they show properly in the list.

## Technical details
- `src/components/grading-list/GradingCardUploadDialog.tsx`: add an `onPaste` handler on both `DialogContent`s that reads `e.clipboardData.files` (falls back to `items` of kind file), renames blank-named files, and passes them to the existing `handlePick` / `handleReuploadPick`. This follows the existing pattern in `ProofOfPaymentUpload.tsx`.
