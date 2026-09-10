# Lower auto-match threshold to 85%

## What changes

Reduce the automatic student-matching threshold from 90% to 85% confidence.

- Update `AUTO_MATCH_THRESHOLD` in `src/utils/submissionMatchConfidence.ts` from `90` to `85`.
- Replace any hard-coded "90%" UI strings in the approval screens and match dialog with the constant, or update them to "85%".

## Affected files

- `src/utils/submissionMatchConfidence.ts` — constant value.
- `src/components/dashboard/PublicGradingSubmissionApprovals.tsx`
- `src/components/dashboard/PublicCompetitionSubmissionApprovals.tsx`
- `src/components/dashboard/PublicSeminarSubmissionApprovals.tsx`
- `src/components/dashboard/PublicGuardsPurchaseApprovals.tsx`
- `src/components/dashboard/SubmissionMatchDialog.tsx` (if it mentions the threshold)
- Any other components that render the "90%" auto-match rule text.

## How it works after the change

- `pickAutoMatch` will link a student automatically when the top suggestion reaches at least 85% confidence and the runner-up is still at least 10 points behind.
- The gap rule (`AUTO_MATCH_GAP = 10`) stays unchanged.
- All four approval surfaces (grading, competitions, seminars/events, uniforms & guards) and the background scan use the same constant, so they all shift together.

## Verification

- Run the TypeScript type-checker.
- Confirm the preview build succeeds with no errors.
- No database or RPC changes are needed; the underlying scoring logic stays the same.