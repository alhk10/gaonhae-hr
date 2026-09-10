# Auto-match students at 90% confidence and above

## What changes

When a payment submission is opened for verification, the app already suggests likely students with a score. Today someone must always click "Use". After this change, when the best suggestion is 90% confident or better, it is selected automatically and the person only confirms.

- The match list shows a plain confidence percentage (e.g. "94% match") instead of the raw score.
- If the top suggestion is 90% or above, and no other suggestion is within 10 points of it, the student is linked automatically as soon as the match window opens.
- A short note appears: "Auto-matched to KAI JIE JOSH CHUEN (94%)" with a "Change" option, so it can always be corrected before importing.
- If two suggestions are both 90%+ and close together, nothing is auto-selected — the list stays as it is today so a person decides.
- Below 90%, behaviour is unchanged.

## How confidence is worked out

The existing scoring adds up: email match 0.5, date of birth match 0.3, same branch 0.1, name similarity up to 0.5 — a maximum of 1.4. Confidence is that score divided by 1.4, shown as a percentage. In the example screenshot the top row scores 1.40, so 100%; the runners-up score 0.81 and 0.80 (58% and 57%), well clear of the auto-match rule.

## Where it applies

The same match window is used in the four approval areas, and all get the same behaviour:

- Grading submissions
- Competition submissions
- Seminar / event submissions
- Uniforms & guards purchases

## Technical notes

- Add a shared helper (e.g. `src/utils/submissionMatchConfidence.ts`) exporting `MAX_MATCH_SCORE = 1.4`, `toConfidence(score)`, and `pickAutoMatch(matches)` implementing the 90% threshold plus the 10-point runner-up gap.
- In `PublicGradingSubmissionApprovals.tsx`, `PublicCompetitionSubmissionApprovals.tsx`, `PublicSeminarSubmissionApprovals.tsx` and `PublicGuardsPurchaseApprovals.tsx`: after the matches query resolves, run `pickAutoMatch` once per submission (guard with a ref keyed on submission id so it does not re-fire), call the existing match mutation, and render the auto-matched banner with a Change action that clears the selection back to the list.
- Replace `score {n.toFixed(2)}` in the reason line with `{confidence}% match`; keep the existing reason text (email match, DOB match, same branch, name %).
- No database or RPC changes — scoring stays as it is.
