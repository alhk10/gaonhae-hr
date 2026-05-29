## Goal

The Superadmin Dashboard currently shows `PublicGradingSubmissionApprovals` (for `/pay`) and `PublicGuardsPurchaseApprovals` (for `/guards`), but is missing the matching + invoicing approval sections for `/comps` and `/seminars`. Add both, mirroring the `/pay` (grading) flow.

## Changes

### 1. New service helpers — `src/services/seminarPaymentSubmissionService.ts`

Seminar service lacks the pending-list helpers the approvals UI needs. Add:

- `PendingSeminarSubmission` type (mirrors `PendingCompetitionSubmission`, with seminar fields: `package_code`, `package_label`, `session_dates`, `amount`, `payment_method`, `proof_url`, `current_belt`, `branch_name`, `student_name`).
- `getPendingSeminarSubmissions(branchId?)` — selects from `seminar_payment_submissions` where `status='pending_verification'` and `matched_invoice_id IS NULL`, enriches with branch name.
- `getPendingSeminarSubmissionsCount(branchId?)` — head/count query, same filter.
- `updateSeminarSubmissionDetails(id, patch)` — direct table update for editable fields (name, dob, email, gender, belt, branch, package, amount, notes). No new RPC needed; superadmin RLS already permits.

No DB migrations. All required RPCs already exist (`admin_match_seminar_submission`, `admin_import_seminar_submission_student`, `admin_create_seminar_invoice`, `admin_reject_seminar_submission`, `admin_delete_seminar_submission`, `find_seminar_submission_student_matches`).

### 2. New component — `src/components/dashboard/PublicSeminarSubmissionApprovals.tsx`

Clone of `PublicCompetitionSubmissionApprovals.tsx`, retitled "Public Seminar Payment Submissions" with `GraduationCap`/`BookOpen` icon. Differences from competition:

- Display package label + session dates instead of coaching/categories.
- "Import as invoice" is a two-step call: `importSeminarSubmissionStudent` (only if not yet matched) then `createSeminarInvoice`. Match button uses `matchSeminarSubmission`.
- Query keys: `pending-seminar-submissions`, `seminar-submission-matches`, `public-seminar-list`.

Same UX as competition/grading: row card with proof thumbnail, Match Student dialog (auto-matches + manual search + create-new), Edit dialog, Reject dialog with reason, Import-as-invoice button enabled only after match.

### 3. Wire competition approvals back into Superadmin Dashboard — `src/components/dashboard/SuperadminDashboard.tsx`

- Import `PublicCompetitionSubmissionApprovals` and the new `PublicSeminarSubmissionApprovals`.
- Render them next to `PublicGradingSubmissionApprovals` (line ~188), in this order: Grading → Competition → Seminar → Guards.
- Add their pending counts to the `pendingInvoiceDeletionsCount + …` total used for the dashboard badge:
  - `getPendingCompetitionSubmissionsCount()` (already exists)
  - `getPendingSeminarSubmissionsCount()` (new, from step 1)

### Out of scope

- No changes to `/comps`, `/seminars`, or `/grading-list` public pages.
- No changes to the Branch Dashboard.
- No new DB tables, columns, or RPCs.

## Technical notes

- All currency, amount, and proof handling reuses the existing `SignedImage` and `formatDate` helpers.
- Match flow uses the existing `find_*_submission_student_matches` RPCs; manual search uses a `students` table query scoped to the submission's `branch_id` (mirroring competition).
- Mutations invalidate the same query keys used by `/grading-list` Comp + Seminar tabs so those tables refresh in sync.
