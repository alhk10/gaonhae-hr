# Public Grading Submission Approvals

## Problem

Public grading payments submitted from `/grading-list` / `/pay` are inserted into `grading_payment_submissions` with `status='pending_verification'`, `matched_student_id=NULL`, `matched_invoice_id=NULL`.

Today nothing reads this table in admin UI:
- `PaymentVerificationApprovals` only queries `payments` (verified=false, non-cash) — public grading submissions never get a `payments` row, so they never appear.
- No matching/import step exists, so even after manual verification there's no link to a student or an invoice.

Result: 9 pending submissions are invisible to Superadmin and Branch dashboards, and there is no workflow to attach them to a student or to generate an invoice/payment.

## Plan

### 1. New approval component: `PublicGradingSubmissionApprovals`

`src/components/dashboard/PublicGradingSubmissionApprovals.tsx`

Props: `{ branchId?: string }` — when set, scope to that branch; otherwise show all (Superadmin view).

Query: `grading_payment_submissions` where `status='pending_verification'`, joined with branch name, grading slot, product (for belt transition + price), ordered by `created_at desc`.

Each row shows:
- Reference number, submitted at (DD/MM/YYYY HH:mm)
- Student name (UPPER), email, DOB, current belt → target belt (from product), branch, slot (date/time/title)
- Amount, payment method, proof image (SignedImage)
- Match status badge: "Unmatched" (amber) / "Matched: <student name>" (green)

### 2. Student name matching

Add `findStudentMatches(submission)` helper in `gradingPaymentSubmissionService.ts`:

1. Exact: `lower(email) = submission.email` AND `date_of_birth = submission.date_of_birth`
2. Strong: same email OR same DOB AND name similarity (uppercase trim) ≥ 0.8 via `pg_trgm` similarity
3. Weak: name similarity ≥ 0.6 within same branch

Returns ranked list `{ id, name, email, dob, score, reason }[]`.

UI: "Match Student" button opens a dialog listing candidates with a search box (live student lookup by name/email). Picking one calls a new RPC `admin_match_grading_submission(p_id, p_student_id)` that sets `matched_student_id` and pre-fills any missing belt/branch fields.

A second button "Create new student…" opens the existing student registration flow prefilled from the submission (name, email, DOB, branch, current belt) and on save writes the new student id back into `matched_student_id`.

### 3. Import to invoice + payment (Verify action)

"Verify & Import" button is enabled only after a student is matched. It calls a new RPC `admin_import_grading_submission(p_id, p_verified_by)` that, in one transaction:

1. Creates an `invoices` row for `matched_student_id`, branch = submission branch, single line item = the resolved grading product at `amount`, status `paid`.
2. Creates a `payments` row: amount = submission amount, method = submission payment_method, `proof_of_payment_url` = submission proof, `is_verified=true`, `verified_by`, `verified_at=now()`, `verification_status='verified'`, linked to the new invoice.
3. Creates the grading registration entry tying the student to `resolved_grading_slot_id` (same path used today by the internal grading flow).
4. Updates the submission: `status='verified'`, `matched_invoice_id=<new invoice>`, `reviewed_by`, `reviewed_at=now()`.

"Reject" button captures a reason → `status='rejected'`, `notes=reason`, `reviewed_by/at` set. No invoice/payment created. Submission disappears from the list.

### 4. Mount the component

- `SuperadminDashboard.tsx` (around line 184, near `PaymentVerificationApprovals`): add `<PublicGradingSubmissionApprovals />` in its own card section "Public Grading Submissions".
- `BranchDashboard.tsx` Approvals tab (near line 1839): add `<PublicGradingSubmissionApprovals branchId={branchId} />`.
- Add a pending count badge using the same pattern as other approvals (e.g. `usePendingGradingSubmissionCount`), and include it in the combined approvals badge already shown on the Approvals tab.

### 5. RLS / RPC

Add three SECURITY DEFINER RPCs (superadmin or branch staff for that branch):
- `admin_match_grading_submission(p_id, p_student_id)`
- `admin_import_grading_submission(p_id, p_verified_by)`
- `admin_reject_grading_submission(p_id, p_reason, p_reviewed_by)`

Plus an RPC `find_grading_submission_student_matches(p_id)` returning ranked candidates using `pg_trgm` (`CREATE EXTENSION IF NOT EXISTS pg_trgm`).

RLS on `grading_payment_submissions`: superadmin all; branch staff limited to `branch_id` they belong to. Existing public INSERT policy stays untouched.

## Technical notes

- Reuse `SignedImage` for proof preview; honor the project rule that proofs must be `image/*` (already enforced at submit).
- Names normalize to UPPERCASE before compare (matches project memory).
- Belt `null` for "No belt" preserved.
- Dates rendered via `@/utils/dateFormat`.
- Mobile-first layout consistent with other approval cards (stacked on mobile, table on `md+`).
- Do not modify `PaymentVerificationApprovals` — public grading flow stays a separate section.

## Out of scope

- Changing the public submission form.
- Refunds for already-imported submissions (handled via existing invoice refund flow once imported).
