## Unmatched public submission approvals (Grading, Guards, Hello)

Goal: superadmin can review each public submission where no student is linked, approve a suggested match, create a new student from the entered details, edit the captured details, or reject — for all three public flows.

### Current state

- **Grading** (`/grading` → `grading_payment_submissions`): full approval UI already exists in `src/components/dashboard/PublicGradingSubmissionApprovals.tsx` (suggested matches, search, "Create student", reject). Editable fields are limited to the create-student form. No way to edit the submission row itself.
- **Guards** (`/guards` → `guards_purchases`): backend helpers `findStudentMatches`, `createStudentFromPurchase`, `createInvoiceForPurchase`, `updateGuardsPurchase` exist in `guardsPurchaseService.ts`, but the admin list `PublicGuardsPurchaseList.tsx` has no matching dialog and no way to act on unmatched rows.
- **Hello** (`/hello` → `public_chat_callback_requests`, types `registration_request`, `no_match_request`, `trial_lead`, `general_callback`): no admin UI at all. Table has no `matched_student_id` column.

### Plan

#### 1. New shared "Unmatched Public Submissions" section

Add one wrapper component `UnmatchedPublicSubmissions.tsx` under `src/components/dashboard/` that renders three subsections in tabs (Grading / Guards / Hello) with per-tab counts. Mount it in:
- `SuperadminDashboard.tsx` (replace the existing standalone `PublicGradingSubmissionApprovals` mount).
- `BranchDashboard.tsx` for branch users (Guards + Grading tabs only, Hello superadmin-only).

Each subsection lists only rows with `matched_student_id IS NULL` and exposes: Match, Create student, Edit details, Reject.

#### 2. Grading subsection (refactor existing)

- Keep `PublicGradingSubmissionApprovals` logic, embed it as the Grading tab.
- Add an "Edit details" button per row that opens a dialog to edit `first_name`, `last_name`, `date_of_birth`, `email`, `phone`, `branch_id`, `current_belt`. Persist via new `updateGradingSubmissionDetails(id, patch)` in `gradingPaymentSubmissionService.ts`.
- After edit, suggested matches re-fetch automatically.

#### 3. Guards subsection (new)

- New `PublicGuardsPurchaseApprovals.tsx` modelled on the grading component, using the existing helpers:
  - List `listGuardsPurchases()` filtered to `matched_student_id IS NULL` and non-rejected.
  - Match dialog: `findStudentMatches(row)` + free-text student search (re-use the `students` ilike pattern from grading), confirm calls `updateGuardsPurchase(id, { matched_student_id })` then `createInvoiceForPurchase(row)`.
  - Create-student: `createStudentFromPurchase(row)` then same finalize flow.
  - Edit details dialog: edit name/DOB/email/phone/branch/belt/gender via `updateGuardsPurchase`.
  - Reject: `updateGuardsPurchase(id, { sale_status: 'rejected' })`.
- Also surface a "Match student" button directly on `PublicGuardsPurchaseList.tsx` rows where `matched_student_id` is null, reusing the same dialog component (extracted as a shared sub-component).

#### 4. Hello subsection (new)

- Migration: add columns `matched_student_id uuid`, `created_student_id uuid`, `rejected_at timestamptz`, `rejected_reason text`, `date_of_birth date`, `gender text`, `current_belt text` to `public_chat_callback_requests` so editing/matching has fields to work with. Parse existing `message` text only for display; new submissions from inline registration will populate the new columns directly (update `submitInlineRegistration` to write them).
- New service `chatCallbackApprovalService.ts` with: `listUnmatchedCallbacks()`, `findStudentMatches(callback)`, `matchCallback(id, studentId)`, `createStudentFromCallback(id)`, `updateCallback(id, patch)`, `rejectCallback(id, reason)`.
- New `PublicHelloCallbackApprovals.tsx` UI mirroring the guards/grading approval layout. Match/Create-student/Edit/Reject. After matching or creating, set `status = 'matched'` (or `'completed'`) and store `matched_student_id`.
- Out of scope: replying to callbacks, scheduling trials — only the unmatched-student approval surface.

#### 5. Shared bits

- Extract a reusable `<StudentMatchPickerDialog />` (under `src/components/dashboard/shared/`) consuming a generic submission descriptor: `{ first_name, last_name, dob, email, phone, branch_id }`, suggested matches, free-text search, "Create new student" callback, "Edit details" callback. Grading, Guards, Hello all use it.
- Counts feed an existing approvals badge bucket if present; otherwise simple inline counts per tab.

### Technical notes

- All edits and matching go through services; the UI never writes to Supabase directly except for the student search query that already exists in the grading component (kept identical).
- Access: superadmin always; branch users only see rows for their accessible branches via existing `branchId` prop pattern.
- No invoice changes for Hello (chat payments require match at submission time, so they never appear unmatched).
- Date display uses `@/utils/dateFormat` per project rules. Names auto-uppercased on save; statuses lowercase; gender `male/female/other`; `current_belt` empty → null.
- Hello migration is additive and nullable so it won't break existing rows.

### Files

New:
- `src/components/dashboard/UnmatchedPublicSubmissions.tsx`
- `src/components/dashboard/PublicGuardsPurchaseApprovals.tsx`
- `src/components/dashboard/PublicHelloCallbackApprovals.tsx`
- `src/components/dashboard/shared/StudentMatchPickerDialog.tsx`
- `src/services/chatCallbackApprovalService.ts`
- migration adding columns to `public_chat_callback_requests`

Edited:
- `src/components/dashboard/PublicGradingSubmissionApprovals.tsx` (add Edit details, adopt shared picker)
- `src/services/gradingPaymentSubmissionService.ts` (add `updateGradingSubmissionDetails`)
- `src/services/guardsPurchaseService.ts` (no schema change; minor helper exports)
- `src/services/publicChatService.ts` (`submitInlineRegistration` writes new columns)
- `src/pages/public/PublicGuardsPurchaseList.tsx` (Match button on unmatched rows)
- `src/components/dashboard/SuperadminDashboard.tsx`, `BranchDashboard.tsx` (mount the new wrapper)
