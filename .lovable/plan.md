# Mirror grading-tab verify behavior on competition & seminar tabs

## Current behavior

- **Grading tab** (`PublicGradingList.tsx`): green check button calls `verifyGradingSubmission` → RPC `admin_verify_grading_submission` flips status to `verified`. No student matching, no invoice creation.
- **Competition tab** (inside `PublicGradingList.tsx`) and **Seminar tab** (`SeminarsTab.tsx`): green check opens a "Match student & verify" dialog (fuzzy search + create-new-student) and then imports the submission as an invoice.
- **Superadmin Dashboard**: `PublicCompetitionSubmissionApprovals` and `PublicSeminarSubmissionApprovals` already provide the full match-and-import workflow.

## Target behavior

- On `/grading-list`, the competition and seminar verify buttons become **one-click verify** (same as grading tab): mark status `verified`, no matching, no invoice generation.
- **Student matching + invoice import remains exclusively on the Superadmin Dashboard**, performed by superadmins via the existing approval components.
- Reject button on both tabs is unchanged.

## Changes

### 1. New SQL migration — verify-only RPCs

Add two security-definer functions modeled on `admin_verify_grading_submission`:

- `public.admin_verify_competition_submission(p_id uuid, p_verified_by text)` — updates `competition_payment_submissions` set `status = 'verified'`, `reviewed_by`, `reviewed_at`, `updated_at`, gated on current `status = 'pending_verification'`.
- `public.admin_verify_seminar_submission(p_id uuid, p_verified_by text)` — same shape against `seminar_payment_submissions`.
- `GRANT EXECUTE ... TO authenticated` for both.

### 2. Service wrappers

- `src/services/competitionPaymentSubmissionService.ts`: add `verifyCompetitionSubmission(id, verifiedBy)` calling the new RPC.
- `src/services/seminarPaymentSubmissionService.ts`: add `verifySeminarSubmission(id, verifiedBy)` calling the new RPC.

### 3. `SeminarsTab.tsx`

- Replace the "Accept (match & verify)" handler with a direct call to `verifySeminarSubmission` (pattern copied from grading tab's `handleVerify`).
- Remove the match dialog (`acceptingRow` state, suggested-matches block, student search, "Create new student from submission & verify" button) — these are no longer reachable from this tab.
- Keep the reject dialog and delete column untouched.
- Update tooltip from "Accept (match & verify)" to "Verify".
- Invalidate `['public-seminar-list']`, `['pending-seminar-submissions']`, `['pending-seminar-submissions-count']` on success.

### 4. Competition table inside `PublicGradingList.tsx`

The competition rows are rendered by an inner component (around lines 1884–2280) that currently calls `importCompetitionSubmission` from an "Accept" dialog.

- Replace the green check action so it calls a new `handleVerifyCompetition` → `verifyCompetitionSubmission(submission_id, verifiedBy)`.
- Remove the match-student dialog (`acceptingId` state, suggested matches, search, "Create new" path) from this component only — superadmin dashboard already owns that flow.
- Keep reject dialog and all other table columns/edits unchanged.
- Invalidate `['public-competition-list']`, `['pending-competition-submissions']`, `['pending-competition-submissions-count']` on success.

### 5. No frontend access change required

Role gating already restricts these icons to `canEdit`. The match-and-import path remains available only via `PublicCompetitionSubmissionApprovals` / `PublicSeminarSubmissionApprovals` on the superadmin dashboard, which is already routed under superadmin-only access.

## Out of scope

- No changes to grading tab.
- No changes to superadmin dashboard approval components.
- No changes to public submission forms, edge functions, or email templates.
- No changes to `extra_lines` / categories work from prior turns.

## Files touched

- `supabase/migrations/<new>.sql` (new)
- `src/services/competitionPaymentSubmissionService.ts`
- `src/services/seminarPaymentSubmissionService.ts`
- `src/components/grading-list/SeminarsTab.tsx`
- `src/pages/public/PublicGradingList.tsx` (competition inner component only)
