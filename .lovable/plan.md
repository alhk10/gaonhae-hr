# Paste images into file uploads

## Goal
Let staff and students paste a screenshot (Ctrl/Cmd+V) instead of choosing a file, starting with the Record Payment proof field shown, then every image upload.

## What changes
- New shared paste-enabled upload field: shows "Choose file" plus a "Click here and press Ctrl+V to paste" area, a small preview, and a remove button.
- Pasting while the dialog is open (not inside a text box) also fills the proof field.
- Same rules as today: images only (PDFs still rejected), same size limits, same storage paths.
- Roll out to: Record Payment (/access), payment proof second upload, /hello proof uploads, grading card, student photos/certificates, rental ID/Bizfile/insurance, /perthcomp proof.

## Technical details
- `PasteableFileInput` component wrapping `<input type=file>`; handles `onPaste` from `clipboardData.files`, renames pasted blob to `pasted-<timestamp>.png`, emits `File` through the existing `onChange` handler so upload code is untouched.
- Reuse logic already present in `ProofOfPaymentUpload.tsx`.
- Start with `AccessRecordPaymentDialog.tsx`, then swap other image `type="file"` inputs (32 found); non-image document inputs keep current behaviour unless they accept images.
