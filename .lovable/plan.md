## Goal

A public, no-login page at `/fees` for paying school (class) fees, styled and structured exactly like `/grading`. Submissions land in the existing **School Fees** tab of `/access` for staff to match, verify or reject.

## Form flow (mirrors /grading)

1. First name, last name, email (validated), branch (from `get_public_branches`).
2. Date of birth (same 3-select DOB picker as /grading) — used for staff matching.
3. **Term** dropdown: terms for the selected branch, defaulting to the current term (or the next upcoming one if today is between terms); user can change it.
4. **Class package** (single-select radio list): active products in the **Classes** category, priced per branch via `price_rules`, excluding one-offs — Trial Lesson, Ad-Hoc Lesson, Private Lesson.
5. Price summary: package price, 9% GST for Singapore branches, total.
6. Payment method (PayNow / Bank transfer) via the shared `PaymentInfoDisplay`, then proof-of-payment image upload (image/* only, PDFs rejected) via `ProofOfPaymentUpload`.
7. Submit → success screen with reference number, same layout as /grading.

## Backend

New SECURITY DEFINER RPCs (no chat session required):

- `get_public_class_products(p_branch_id)` — active Classes-category products with branch price override, excluding the one-off SKUs.
- `get_public_terms_for_branch(p_branch_id)` — term id/name/start/end from `term_calendars` for the branch, used for the default-term logic.
- `submit_public_school_fees(...)` — validates inputs, inserts into `public_chat_payment_submissions` with `category = <Classes category id>`, `session_id = NULL`, `matched_student_id = NULL`, `status = 'pending_verification'`, a generated reference number, the proof URL, and an `items` array carrying product id/name, unit price, qty 1, `term_id`/`term_name`, plus contact fields (first/last name, email, DOB) so staff can match later. No invoice is created at submit time.

Update `get_public_school_fees_list` so unmatched rows show the submitted contact name (fallback to the name stored in `items`) instead of a blank cell, and expose email/DOB for matching.

Reuse the existing verify / reject / delete RPCs. Add `admin_match_school_fees_submission(p_id, p_student_id)` that links a submission to a student and creates the paid-pending invoice (same shape `submit_public_chat_invoice` produces), so verification can then flip invoice/payment to verified.

## /access School Fees tab

- Show contact name + email + DOB for unmatched rows, with an amber "Unmatched" badge.
- Add a **Match** action opening a student search dialog (mirroring the grading tab's match dialog) that calls the new match RPC; Verify stays disabled until a submission is matched.

## Frontend files

- `src/pages/public/PublicSchoolFeesPayment.tsx` — new page, built from `PublicGradingPayment.tsx` with grading-specific belt/slot logic replaced by term + class package selection.
- `src/services/schoolFeesSubmissionService.ts` — add `getPublicClassProducts`, `getPublicTermsForBranch`, `submitSchoolFeesPayment`, `matchSchoolFeesSubmission`.
- `src/components/grading-list/SchoolFeesTab.tsx` — unmatched display + match dialog.
- `src/App.tsx` — add route `/fees`.

## Technical notes

- Proof upload path: `public-fees/{branch_id}/{timestamp}_{NAME}.{ext}` in the `payment-proofs` bucket, matching the existing pattern.
- Names uppercased, email trimmed/lowercased; zod validation with length limits before submit.
- Dates displayed DD/MM/YYYY through `@/utils/dateFormat`.
- GST 9% applied only for Singapore branches, consistent with `/grading`.
