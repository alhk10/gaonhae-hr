## Goal
Track per-event "grading card" requirement that admin (not customer) must satisfy before verifying a competition submission, surface it inline in `/grading-list` competitions tab, and enforce it at verify time. Grading card applies only to color belts (Foundation 1 → Black Tip).

## 1. Database migration
- `competition_events`: add `require_grading_card boolean NOT NULL DEFAULT false`.
- `competition_payment_submissions`: add `grading_card_urls text[] NOT NULL DEFAULT '{}'`.
- Update `get_public_competition_list` RPC to also return `require_grading_card` (from `ev`) and `grading_card_urls` (from `cps`).
- Reuse existing `payment-proofs` storage bucket; files saved under `competition/<submission_id>/grading-card-<timestamp>-<n>.<ext>`. No new bucket needed.

## 2. Settings dialog — `CompetitionEventsSettingsDialog.tsx`
- Extend `emptyForm()` and `startEdit()` with `require_grading_card`.
- Persist via existing `adminUpsertCompetitionEvent` (extend service signature to pass the new field through).
- After the existing "Required uploads" block (closes at line 549), add a new section:
  ```
  Required from Admins
    [ ] Grading card upload
  ```
  Bound to `form.require_grading_card`. Helper text: "Admin must upload a grading card before verifying. Applies only to color-belt participants (Foundation 1 → Black Tip)."

## 3. Service layer — `competitionPaymentSubmissionService.ts`
- Extend `CompetitionEvent` type, `adminUpsertCompetitionEvent` payload, and `PublicCompetitionListRow` type with the two new fields.
- Add `adminUploadCompetitionGradingCards(submissionId, files: File[])`:
  - Upload each file to `payment-proofs` under the path above (image/* and application/pdf accepted).
  - Append signed-public URLs to `competition_payment_submissions.grading_card_urls` array via update.
  - Reuse the existing `safeUpload` / retry helpers.

## 4. `/grading-list` — competitions tab inline icon
In the uploads icon row (around lines 2228–2268) add a `Grading card` entry rendered only when:
- `r.event_id` is set and `r.require_grading_card === true`, AND
- `r.current_belt` ∈ {Foundation 1, Foundation 2, Foundation 3, Foundation, White, Yellow Tip, Yellow, Green Tip, Green, Blue Tip, Blue, Red Tip, Red, Black Tip} (reuse `isFoundationToBlackTip` from `@/constants/beltLevels`).

Icon = `IdCard` (lucide). States:
- **Uploaded (one or more URLs):** green icon; click opens the existing `preview` viewer for the first URL (or a small list popover if multiple).
- **Required and missing:** amber/red icon with `AlertTriangle` overlay or tooltip "Grading card required"; click opens the upload dialog below.

## 5. Verify-gate dialog
New small component `GradingCardUploadDialog` (in `src/components/grading-list/`) — multi-file `<input type="file" accept="image/*,application/pdf" multiple>`, file list with remove, Upload+Verify / Upload only / Cancel.

Wiring in `PublicGradingList.tsx` competitions section:
- New helper `gradingCardRequiredAndMissing(r)` = require flag + belt-in-range + `grading_card_urls.length === 0`.
- Wrap the existing competition `handleVerify`:
  - If `gradingCardRequiredAndMissing(r)` → set `gradingCardDialogRow = r` with `pendingVerify = true` instead of verifying.
  - Otherwise current behaviour.
- Inline IdCard icon (missing state) also opens the dialog with `pendingVerify = false`.
- Dialog on submit: calls `adminUploadCompetitionGradingCards`, invalidates `['public-competition-list']`. If `pendingVerify`, then calls `verifyCompetitionSubmission`. Toast errors via existing pattern.

## 6. Out of scope
- Grading-tab submissions, seminars, guards — no changes.
- Customer-facing `/comps` form — no changes; this is an admin-only upload.
- No new public RPCs; uploads use authenticated admin client (`canEdit` already gates the UI).

## Files touched
- new migration (add columns + replace `get_public_competition_list`)
- `src/services/competitionPaymentSubmissionService.ts`
- `src/components/grading-list/CompetitionEventsSettingsDialog.tsx`
- `src/components/grading-list/GradingCardUploadDialog.tsx` (new)
- `src/pages/public/PublicGradingList.tsx`
