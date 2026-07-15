## Add "Photo" column to Competitions tab

In `src/pages/public/PublicGradingList.tsx` (Competitions table only — the screenshot is `/grading-list` → Competitions tab).

### Header
Insert `<TableHead>Photo</TableHead>` between `Grading Card` (line 2339) and `Proof` (line 2340).

### Body cell
Insert a new `<TableCell>` between the Grading Card cell (line 2425-2454) and the Proof cell (line 2455-2457), rendering:

```tsx
<Thumb
  url={r.photo_url}
  title={`${r.student_name} — Photo`}
  kind="photo"
  submissionId={r.submission_id}
  branchId={r.branch_id}
/>
```

### Thumb + preview dialog updates
Extend the existing `Thumb` component and the shared `preview` dialog (already handles `certificate` and `proof`) to also handle `kind: 'photo'`:

- `Thumb`: when `kind === 'photo'` and no URL, render an upload button (mirrors the certificate empty-state) that opens a file picker; on select, uploads via a new `adminReplaceCompetitionSubmissionPhoto` helper.
- `preview` dialog: when `preview.kind === 'photo'`, show a "Reupload" button that calls the same helper — identical UX to the certificate reupload block (lines ~2570–2609).

### New service helper
Add `adminReplaceCompetitionSubmissionPhoto(submissionId, file, branchId)` to `src/services/competitionPaymentSubmissionService.ts`, matching the existing `adminReplaceCompetitionSubmissionFile('proof', …)` pattern but writing to `photo_url` on the competition submission row and uploading to the `payment-proofs` bucket under `public-competition/{branchId}/{ts}_photo.{ext}`.

### Docs cell cleanup
Remove the small photo icon inside the "Docs" cell (lines 2475–2479) and drop `photo_url` from the empty-state check on line 2480, since Photo now has its own column.

### Out of scope
- Grading tab (no photo column there today).
- Seminars tab.
- RLS / storage policy / migration changes (bucket + column already exist).
- Bulk photo operations.

### Technical notes
- `Thumb` currently accepts `kind?: 'certificate' | 'grading-card' | 'proof'` (line 2193) — widen to include `'photo'`.
- `preview` state (line 2027) already has `kind?: 'certificate' | 'proof'` — widen to include `'photo'` and reuse the existing dialog shell.
- Invalidate `['public-competition-list']` after upload, same as the certificate flow.
