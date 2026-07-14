# Plan: Cap grading card uploads at 2 files total

## Scope
`src/components/grading-list/GradingCardUploadDialog.tsx` only. Enforce a maximum of 2 grading card files per submission (existing + newly picked combined).

## Changes

1. **Compute remaining slots**
   - `const MAX_FILES = 2;`
   - `const remaining = Math.max(0, MAX_FILES - existingUrls.length - files.length);`

2. **`handlePick`** — trim the incoming selection so combined total never exceeds 2:
   - Filter to image/PDF as today.
   - Slice to `remaining`.
   - If the user picked more than `remaining`, show a toast: "Only 2 grading card files allowed — extra files ignored."
   - If `remaining === 0` before picking, toast: "Maximum of 2 grading card files reached" and return.

3. **Add-files button**
   - Disable "Add files" button when `remaining === 0`.
   - Update helper text near the file list: "{existingUrls.length + files.length} of 2 files".

4. **Existing files list**
   - Keep the "Already uploaded" list as-is; it counts toward the cap.

5. **Submit button**
   - Unchanged behaviour aside from cap. Still gated by password unlock and `files.length > 0 || pendingVerify`.

## Out of scope
- Backend/RLS or storage changes.
- Server-side enforcement (existing service call `adminUploadCompetitionGradingCards` is unchanged).
- Deleting already-uploaded grading cards from within this dialog.

## Technical notes
- No new dependencies, no migrations.
- Only one file edited.
