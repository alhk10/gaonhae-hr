Two changes in `src/components/grading-list/GradingCardUploadDialog.tsx`. Page-level unlock already gates access.

### 1. Remove password gate
- Delete `UNLOCK_PASSWORDS`, `password`/`unlocked` state, and the entire Unlock password `Label`/`Input` block.
- Remove `!unlocked` from the Submit disabled check and drop the `Enter the unlock password to upload` guard in `handleSubmit`.
- `reset()` no longer touches `password`.
- Drop unused `Lock`, `Label`, `Input` imports.

### 2. Allow reupload of existing grading cards
- In the "Already uploaded" list, add a small trash button next to each entry that removes that URL from `grading_card_urls`.
- Add a new service `adminSetCompetitionGradingCards(submissionId, urls)` in `src/services/competitionPaymentSubmissionService.ts` that overwrites the `grading_card_urls` array (used for deletions). Existing `adminUploadCompetitionGradingCards` continues to handle appends.
- Wire the trash click → call the new service → toast → `onUploaded?.()` so the parent list re-fetches; local `existingUrls` is prop-driven so it refreshes on invalidate.
- The `MAX_FILES = 2` cap now naturally allows a new upload once a slot is freed (existing `remaining` math already handles it).
- Keep the "Add files" flow unchanged — reupload = delete one + add new within the same dialog.

No other files change.