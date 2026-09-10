# Sort controls for public submission approvals

Add sort toggles to the approval lists so staff can surface the rows that still need action.

## Changes

In the header of each of the four approval components (next to "Scan & match"):

- `src/components/dashboard/PublicGradingSubmissionApprovals.tsx`
- `src/components/dashboard/PublicCompetitionSubmissionApprovals.tsx`
- `src/components/dashboard/PublicSeminarSubmissionApprovals.tsx`
- `src/components/dashboard/PublicGuardsPurchaseApprovals.tsx`

1. **"Unmatched / unverified first" toggle button** — when on, submissions that are unmatched (no linked student) or not yet verified sort to the top; already matched-and-verified rows sink to the bottom.
2. **Newest first / Oldest first toggle button** — flips the date order within those groups (current default stays newest first).

Both are client-side sorts on the already-fetched list (a memoized derived array), so no database or service changes are needed. Guards purchases use their own matched/verified fields but follow the same rule.

## Technical details

- Add `sortActionFirst` (default true) and `sortAsc` (default false) state per component.
- Derive `sortedSubmissions` with `useMemo`: key = (needsAction ? 0 : 1, created_at asc/desc). "Needs action" = no `matched_student_id` OR status not verified.
- Render `sortedSubmissions` instead of `submissions` in the list `.map`.
- Buttons: small outline `Button`s with `ArrowUpDown` / status icons, pressed state shown via variant.
