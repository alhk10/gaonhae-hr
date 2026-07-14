## Goal
On the Competitions tab of `/grading-list` (public), let anyone who has entered the view password submit either a Certificate or a Grading Card for every row — no belt / `require_grading_card` gating.

## Changes (frontend only)

**`src/pages/public/PublicGradingList.tsx`**

1. Extend the `Thumb` component to also handle `kind: 'grading-card'`:
   - Accept `kind?: 'certificate' | 'grading-card'` plus the existing `submissionId` / `branchId` props.
   - When `url` is null and `kind === 'grading-card'` with a `submissionId`, render an amber `IdCard` upload button that opens `setGradingCardDialog({ row, pendingVerify: false })`.
   - Certificate branch stays as today (Upload icon → preview dialog in empty mode).

2. Rewrite the Grading Card column cell so it no longer checks `require_grading_card` or `isFoundationToBlackTip`:
   - If `grading_card_urls?.length > 0` → keep the existing green `IdCard` + count badge button that opens `GradingCardUploadDialog`.
   - Else → render the new `Thumb` in `grading-card` mode (amber `IdCard` upload button) that opens `GradingCardUploadDialog` for that row.
   - Drop the `AlertTriangle` "required" affordance from this always-available surface (it stays only inside the verification flow, which is untouched).

3. Certificate column: no change — already always uploadable when empty.

## Out of scope
- No changes to grading tab, guards tab, seminar tab.
- No changes to password / auth flow (already removed for uploads earlier).
- No changes to `require_grading_card` verification logic — verify-time enforcement still fires where it already does.
- No service or backend changes; existing `adminUploadCompetitionGradingCards` / certificate upload paths are reused.
