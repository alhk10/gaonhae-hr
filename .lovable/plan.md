# Inline Edit Button — Competitions & Seminars tabs

Add a pencil icon to each row in the Competitions and Seminars sub-tabs of `/grading-list`. Clicking opens a dialog containing the existing public submission form prefilled with that row's data; saving updates the original submission row.

## Access control
- Visible to: superadmin always.
- Non-superadmin: button visible too, but on first click in the session a password prompt appears. Correct password (`Hp84311884`) unlocks edit for the rest of the page session (kept in component state only, not stored anywhere).
- Wrong password → toast error, dialog stays closed.

## UI changes

**Competitions tab** (`src/pages/public/PublicGradingList.tsx`, `CompetitionsTab` section near line 2213):
- In the existing `Actions` cell, add a `Pencil` icon button before the verify/reject pair (always shown, not gated by `pending verification`).
- Click → password gate → open `EditCompetitionSubmissionDialog`.

**Seminars tab** (`src/components/grading-list/SeminarsTab.tsx`):
- Add `Pencil` icon button to the `Actions` cell (always shown).
- Click → password gate → open `EditSeminarSubmissionDialog`.

Both buttons use `lucide-react`'s `Pencil`, `h-3.5 w-3.5`, blue tint, same compact styling as the existing verify/reject icons.

## New components

**`src/components/grading-list/EditPasswordGate.tsx`**
- Small `Dialog` with single password input + Unlock button.
- Calls `onUnlock()` when input === `Hp84311884`.
- Parent components hold a `editUnlocked` boolean; once true, opening the edit dialog skips the prompt.

**`src/components/grading-list/EditCompetitionSubmissionDialog.tsx`**
- `Dialog` (max-w-3xl, max-h-[85vh] overflow-y-auto, mobile responsive per portal pattern).
- Loads full row from `competition_payment_submissions` by id via a new `getCompetitionSubmissionForEdit(id)` service.
- Renders the same field groups as `PublicCompetitionPayment.tsx`: student first/last name (uppercase), email, DOB, gender, branch, current belt, event, categories (multi-select from `competition_events` + extras), poomsae 1/2, amount (computed), proof upload, certificate upload, signature/indemnity/passport/photo uploads.
- Save calls a new `adminUpdateCompetitionSubmission(id, patch, files?)` that:
  - Updates row fields via existing `updateCompetitionSubmissionDetails` + `updateCompetitionSubmissionCategories` + `updateCompetitionPoomsae` + `updateCompetitionSchedule`.
  - For replaced files, uploads to the same storage bucket the public form uses and updates the corresponding `*_url` columns.
- On success: `qc.invalidateQueries(['public-competition-list'])` + close dialog + toast.

**`src/components/grading-list/EditSeminarSubmissionDialog.tsx`**
- Mirrors competition dialog but for seminar fields (student info, branch, belt, package selection, proof, indemnity, etc.) per `seminar_payment_submissions`.
- Save calls existing `updateSeminarSubmissionDetails` plus a new helper for package/amount/proof updates.

## Service additions

`src/services/competitionPaymentSubmissionService.ts`:
- `getCompetitionSubmissionForEdit(id)` → fetches the raw submission row (all columns) for the dialog.
- `adminUpdateCompetitionSubmissionFiles(id, { proof?, certificate?, signature?, indemnity?, passport?, photo? })` → uploads any provided File to the existing storage path pattern and patches the matching `*_url` column.

`src/services/seminarPaymentSubmissionService.ts`:
- `getSeminarSubmissionForEdit(id)`.
- `adminUpdateSeminarSubmissionFull(id, patch, files?)` covering package/amount/proof/etc.

No DB schema changes, no migrations, no RLS changes — both tables already allow service-role-style updates via the admin path used today.

## Out of scope
- No changes to the grading tab's existing edit flow (already has Bulk Edit).
- No bulk edit for Competitions/Seminars.
- No audit log table — file/field updates rely on existing `*_payment_submissions` history if any; no new logging beyond what the underlying services already do.

## Verification
- Open `/grading-list` → Competitions tab on mobile and desktop: pencil shows on every row, click prompts password, correct password opens dialog with row prefilled, edits persist after save and list refreshes.
- Repeat on Seminars tab.
- Logged-in superadmin skips the password prompt.
- Wrong password shows toast "Incorrect password" and dialog stays closed.
