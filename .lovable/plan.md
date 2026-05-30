# Fix /grading-list Guards tab in incognito (non-superadmin) sessions

## Root cause

`guards_purchases` RLS only allows:
- `anon`: insert + read-back of the just-inserted row (POST only)
- `authenticated` superadmin: read / update / delete

The other three tabs (grading, competitions, seminars) use the broader pattern:
- staff with `has_branch_access(branch_id)`: read + update
- superadmin: full control

So in an incognito session signed in as a non-superadmin staff member with branch access, Grading / Competitions / Seminars load, but the Guards tab returns 0 rows and verify/reject/collected/edit calls silently fail.

## Fix

Add policies on `public.guards_purchases` to mirror the submissions tables (no changes to the existing anon-insert flow, and no frontend changes):

1. SELECT — `has_branch_access(branch_id)` for authenticated staff
2. UPDATE — `has_branch_access(branch_id)` for authenticated staff (USING + WITH CHECK)

The existing superadmin read/update/delete policies and the anon insert + insert-result read policies stay as-is.

## Out of scope

- No frontend changes to `src/pages/public/PublicGuardsPurchaseList.tsx` or `PublicGradingList.tsx`
- No change to anonymous public submission flow at `/guards`
- No change to grading / comp / seminar tabs (already correct)
- Delete remains superadmin-only (matches existing behaviour for the other three tabs)

## Verification after migration

- Incognito as a non-superadmin branch staff → Guards tab lists rows for their branch, verify/reject/collected/edit all succeed
- Incognito as superadmin → unchanged, sees all
- Public `/guards` submission flow → unchanged
