# Fix edit dialog + mass edit on Public Grading List

Two issues, both rooted in submissions being treated as a second-class row:

1. **Row edit dialog** on a submission row only shows the Slot field (see screenshot of "Edit submission — TEST TEST"). Certificate name and Result fields are gated to `source === 'registration'`.
2. **Mass edit** does nothing when only submissions are selected, because `selectedRows` filters out `source !== 'registration'`. Both the header "Edit (N)" button counter and the dialog stay at 0, and no rows are mass-updated.

## Changes

### 1. Submission edit dialog parity
File: `src/pages/public/PublicGradingList.tsx`

- In the row edit dialog, remove the `editRow.source === 'registration'` wrapper so Display name, Certificate name, Branch, and Result render for both registrations and submissions.
- Keep Slot below as it already is for both.
- Display name (submission) edits the submission's `student_name` text. Certificate name still writes to `students.certificate_name` only when `editRow.student_id` is set (unchanged guard).

### 2. New RPCs for submissions
Migration: add admin RPCs mirroring the registration ones so submission saves work:
- `admin_update_grading_submission_branch(p_id uuid, p_branch_id uuid)` — updates `grading_payment_submissions.branch_id` (and clears slot_id if branch changes, matching registration behavior).
- `admin_update_grading_submission_display_name(p_id uuid, p_display_name text)` — updates `grading_payment_submissions.student_name`.
- `admin_update_grading_submission_result(p_id uuid, p_result text)` — updates a `result` column on `grading_payment_submissions` (add column if it doesn't already exist; nullable text, no check constraint, validated app-side).

Service wrappers added in `src/services/gradingPaymentSubmissionService.ts` alongside the existing admin functions.

### 3. Wire saves for submissions
In `handleRowEditSave`, replace the current submission branch (slot-only) with the full set of ops when `source === 'submission'`:
- display_name → `adminUpdateGradingSubmissionDisplayName`
- branch_id → `adminUpdateGradingSubmissionBranch`
- slot_id → `adminUpdateGradingSubmissionSlot` (existing)
- result → `adminUpdateGradingSubmissionResult`
- certificate_name → `adminUpdateStudentCertificateName` (when `student_id` is present, same as registration path)

### 4. Mass edit includes submissions
- `selectedRows` (memo): remove the `r.source !== 'registration'` skip so submission rows count toward selection and `selectedRows.length`.
- "Edit (N)" header button reflects submissions too. Mass Edit dialog opens with non-zero count.
- In `handleMassEditApply`:
  - Result: also apply to submissions using `adminUpdateGradingSubmissionResult` (drop the "registrations only" restriction; update the label in the dialog).
  - Branch: also apply to submissions using `adminUpdateGradingSubmissionBranch` (drop "registrations only" label).
  - Slot: already handles both branches, unchanged.
- Update the mass-edit dialog labels to drop "(registrations only)" qualifiers now that both apply.

### 5. RLS / permissions
The new RPCs are `security definer` with `set search_path = public`, and gate writes to the same admin allowlist used by the existing registration RPCs (Hp97533488 / Hp84311884 user check already implemented in the existing admin RPCs — reuse that helper or inline the same check).

## Out of scope
- No change to certificate eligibility logic or the resolve-cert-name chain.
- No change to selection checkbox behavior beyond what's required for the count.
- No UI restyle.
