# Lower auto-match threshold to 77%

## What changes

Reduce the automatic student-matching threshold from 85% to 77% confidence across all submission approval surfaces.

## Affected files

- `src/utils/submissionMatchConfidence.ts` — change `AUTO_MATCH_THRESHOLD` from `85` to `77`.
- `src/utils/submissionAutoMatch.ts` — update the header comment that says `>= 90%` to reference the shared constant instead.
- `src/components/dashboard/PublicGradingSubmissionApprovals.tsx` — update inline comment "85%+" to "77%+".
- `src/components/dashboard/PublicCompetitionSubmissionApprovals.tsx` — update inline comment "85%+" to "77%+".
- `src/components/dashboard/PublicSeminarSubmissionApprovals.tsx` — update inline comment "85%+" to "77%+".
- `src/components/dashboard/PublicGuardsPurchaseApprovals.tsx` — update inline comment "85%+" to "77%+".

## How it works after the change

- `pickAutoMatch` will link a student automatically when the top suggestion reaches at least 77% confidence and the runner-up is still at least 10 points behind.
- The gap rule (`AUTO_MATCH_GAP = 10`) stays unchanged.
- All four approval surfaces (grading, competitions, seminars/events, uniforms & guards) and the background scan use the same constant, so they all shift together.

## Verification

- Run the TypeScript type-checker.
- Confirm the preview build succeeds with no errors.
- No database or RPC changes are needed; the underlying scoring logic stays the same.
