# Scan, match and import outstanding submissions automatically

Today a submission is only auto-matched when someone opens its match window. This makes the
matching happen on its own for every outstanding line, across all four areas.

## What changes

When an approvals list loads (grading, competitions, events/seminars, uniforms & guards):

1. Every outstanding line that is not yet linked to a student is checked against the suggestion
   list in the background.
2. If the best suggestion is 90% or better and clearly ahead of the runner-up, the line is linked
   automatically — the same rule already used in the match window.
3. Any line that is then both payment-verified and linked is turned into a paid invoice
   automatically and drops off the list.
4. A short summary appears once the pass finishes, e.g. "Matched 4, imported 3".

Lines below 90%, or where two suggestions are too close to call, are left alone for a person to
decide. Nothing is verified automatically — payment verification stays a human decision.

## Manual control

A **Scan & match** button sits at the top of each list, showing a spinner while it runs, so staff
can re-run the pass after verifying a batch of payments without reloading the page.

## Failures

If a match or import fails for a line, that line stays in the list with a short red note saying
why, and the existing buttons remain available. Errors on one line never stop the rest of the pass.

## Technical notes

- New `src/utils/submissionAutoMatch.ts`: `runAutoMatchSweep(scope, rows, { getId, needsMatch,
  fetchMatches, match, maxScore })` — processes rows sequentially (to respect the shared match
  RPC), reuses `pickAutoMatch` from `submissionMatchConfidence.ts`, and keeps a per-scope `Set` of
  attempted ids so a re-render never re-fires. Exposes `clearAutoMatchAttempts(scope)` for the
  manual button.
- Wire into `PublicGradingSubmissionApprovals.tsx`, `PublicCompetitionSubmissionApprovals.tsx`,
  `PublicSeminarSubmissionApprovals.tsx` and `PublicGuardsPurchaseApprovals.tsx`, each passing its
  own `find_*_student_matches` fetcher, `admin_match_*` call and max score
  (`MAX_GUARDS_MATCH_SCORE` for guards).
- Order per list: run the match sweep first, then the existing `runAutoImportSweep`, then
  `invalidate()` once — so a freshly matched + verified line imports in the same pass.
- Add a shared `ScanAndMatchButton` (or a small local button per screen) that clears both attempt
  sets for its scope and re-runs the two sweeps.
- No database or RPC changes; scoring and the 90% / 10-point gap rule are unchanged.
