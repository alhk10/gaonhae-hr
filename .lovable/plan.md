# Clickable proof & certificate previews in Superadmin approvals

## Goal
In Superadmin Dashboard approval cards, allow clicking the Proof / Certificate thumbnails to open a dialog showing the full-size image.

## Changes

1. **New reusable component** `src/components/common/SignedImagePreview.tsx`
   - Wraps `SignedImage` in a `<button>` that opens a shadcn `Dialog`.
   - Dialog shows the same `SignedImage` at full size (`max-h-[85vh] w-auto`), with the label as title and a download/open-in-new-tab link.
   - Props: `src`, `alt`, `label`, `thumbClassName`.

2. **Use it in the three approval lists** (replace inline `<SignedImage>` thumbnails only — keep all other logic untouched):
   - `src/components/dashboard/PublicCompetitionSubmissionApprovals.tsx` — Proof + Certificate
   - `src/components/dashboard/PublicSeminarSubmissionApprovals.tsx` — Proof
   - `src/components/dashboard/PublicGradingSubmissionApprovals.tsx` — Proof
   - (Optionally `PublicGuardsPurchaseApprovals.tsx` if it shows a proof thumbnail — check and apply same pattern.)

## Out of scope
No changes to approval logic, data fetching, or non-superadmin views.
