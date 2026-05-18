## Problem

On `/grading-list` (admin edit mode unlocked), the green Verify and red Reject buttons never appear next to `pending verification` rows.

Root cause: the RPC `get_public_grading_list` (migration `20260518050707_...sql`, lines 49 & 82) returns `paid_status` as the string `'pending verification'` (with a space). But `src/pages/public/PublicGradingList.tsx` lines 537 and 550 gate the buttons on `r.paid_status === 'pending_verification'` (underscore). The strings never match, so the buttons render nothing.

The badge already displays `'pending verification'` correctly because it just prints `r.paid_status` verbatim.

## Fix

File: `src/pages/public/PublicGradingList.tsx`

Change both conditions (lines 537 and 550) from:
```
r.paid_status === 'pending_verification'
```
to:
```
r.paid_status === 'pending verification'
```

No DB / RPC / service changes. Frontend only.

## Verification

1. Unlock edit mode on `/grading-list`.
2. Confirm rows with the amber `pending verification` badge now show both the green check (Verify) and red X (Reject) icons.
3. Confirm `paid` / `verified` / `rejected` rows still show no Verify/Reject buttons.
