## Problem
`NoticePopupDialog` renders the notice image with raw `<img src={notice.image_url}>`, but the `notice-attachments` bucket is **private**. Public URLs 404, so the popup shows a broken image (matches the empty/blank area seen in the screenshot for image-bearing notices).

## Fix
Edit `src/components/notices/NoticePopupDialog.tsx`:
- Replace both `<img src={notice.image_url} ...>` occurrences (inline preview ~line 114 and full-size viewer ~line 223) with `<SignedImage src={notice.image_url} ...>` from `@/components/common/SignedMedia`.
- Add the import alongside the existing `openSignedUrl` import.

No other files, no DB/storage changes (bucket stays private; signed URLs are the intended path, same pattern just used for the payment-proof fix).

## Out of scope
Audit of every other notice/image surface — separate pass if needed.
