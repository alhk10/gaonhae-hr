# Standardise matching, verification and import

Grading, competitions, events (seminars), uniforms & guards, and school fees each handle
"who is this person / is the payment real / turn it into an invoice" slightly differently
today. This makes all five behave the same, and makes the invoice appear on its own once a
line is both payment-verified and matched to a student.

## One shared standard

Every submission line, wherever it appears, gets:

- The same two status chips: **Pending / Verified** for the payment and **Matched / Unmatched**
  for the student.
- The same action row, in the same order: **Match student** (becomes **Re-match** once linked),
  **Verify & import** (**Import as invoice** when already verified), **Edit details**, **Reject**.
- The same match dialog: suggested people shown as a plain match percentage, a search box, and a
  **Create new student** option. Anything 90% or better and clearly ahead of the runner-up is
  linked automatically, as it already does for grading.

Uniforms & guards keeps its own extras (sizes, collection), but the match/verify/import row and
dialog look and behave like the rest.

## Automatic import

As soon as a line is **both** verified and matched — in either order — it is turned into a paid
invoice automatically, and the line drops off the pending list.

- Verify a line that is already matched → invoice created straight away.
- Match a line whose payment was already verified → invoice created straight away.
- Lines that are already verified and matched from before are picked up the next time the list
  loads, so nothing is left stranded.
- If the invoice already exists, nothing happens twice.

The manual **Verify & import** button stays for lines that are matched but not yet verified, so
staff can still do both in one click when they trust the proof.

## Failures

If the automatic import fails (missing product, price mismatch, permission), the line stays in
the list with a short red note explaining why, and the manual button remains available. No
silent failures.

## Technical notes

- New `src/utils/submissionAutoImport.ts`: a per-row guard (`Set` of ids already attempted this
  session) plus `runAutoImportSweep(rows, { isVerified, isMatched, hasInvoice, import })`, so each
  surface wires its own predicates and import call.
- Existing RPCs are reused unchanged — `admin_verify_*`, `admin_match_*`,
  `admin_import_grading_submission`, `admin_import_competition_submission`,
  `admin_import_seminar_submission_student`, `admin_verify_accessory_submission`,
  `admin_match_school_fees_submission`. No database migration.
- Wire the sweep into:
  - `src/components/dashboard/Public{Grading,Competition,Seminar}SubmissionApprovals.tsx`
    (on query data + after a successful match).
  - `src/components/dashboard/PublicGuardsPurchaseApprovals.tsx` (already imports on match; add
    the verified-side trigger and align labels/badges).
  - `src/pages/public/PublicGradingList.tsx` (grading + competition verify handlers) and
    `src/components/grading-list/{SeminarsTab,SchoolFeesTab}.tsx` (verify handlers) — after a
    verify succeeds, attempt the import for that row.
- Extract the shared status badges + action row into
  `src/components/dashboard/SubmissionApprovalRow.tsx` and the shared match dialog into
  `src/components/dashboard/SubmissionMatchDialog.tsx`, so the five screens stop drifting apart.
- Match percentages continue to use `src/utils/submissionMatchConfidence.ts`.
