## Problem

After saving the Edit dialog for a submission row, the Result column keeps showing `—` even though the database is updated. Root cause is in `PublicGradingList.tsx` around line 1197–1216: the inline Result cell only renders an interactive Select when `r.source === 'registration'`. For submission rows it always renders a static `—`, so the new `result` value (now returned by `get_public_grading_list` and saved via `admin_update_grading_submission_result`) is never displayed after the cache refetches.

The query invalidation, RPCs, and DB columns are all working correctly (verified against `get_public_grading_list`).

## Change

In `src/pages/public/PublicGradingList.tsx`, update the Result table cell (~lines 1197–1216) so submissions also render an interactive Select bound to `r.result`:

- Branch on `r.registration_id || r.submission_id` instead of only `registration`.
- For registration rows, keep calling `handleResultChange` (which routes to `adminUpdateGradingResult`).
- For submission rows, call a new small handler `handleSubmissionResultChange` that calls `adminUpdateGradingSubmissionResult(r.submission_id, value)`, toasts, and invalidates `['public-grading-list']` (mirrors `handleResultChange`).
- Keep the same `SelectItem` options (double / pass / fail / confirmed / __clear__).

No DB or RPC changes — those are already in place. No mass-edit or dialog logic changes.

## Out of scope

- Certificate eligibility logic, mass edit, dialog field set.
- Realtime subscriptions (invalidate-on-save is sufficient now that the cell is bound).
