# Fix supporting documents in Summary approvals

## Problem
In Summary, under Approvals & verifications, the proof thumbnails and the enlarged view show a broken image. The files are stored privately. The row loads the stored link as it is, but a private file needs a short-lived signed link. Proofs saved as plain file paths (for example `/hello` uploads) are also skipped, so they never appear.

## Fix
- Resolve each proof to a signed link before showing it, in both the small thumbnail and the enlarged view.
- Include proofs saved as plain file paths, not only full web links.
- Add an **Open in new tab** link in the enlarged view.
- If a file still can't load, show "Document unavailable" instead of a broken icon.

## Technical details
- `SummaryApprovalRow.tsx`: replace `<img src={u}>` with `SignedImage` from `@/components/common/SignedMedia`, which uses `resolveStorageUrl`. Use it for both the thumbnail and the preview dialog. Add `SignedLink` for opening the file in a new tab.
- `proofs()`: keep any non-empty string, not only `https://` links. `resolveStorageUrl` already maps bare `public-hello/`, `public-grading/` and similar paths to the `payment-proofs` bucket.
- Add an `onError` fallback text.
- Verify in the browser that the thumbnail and preview render on a real pending row.
