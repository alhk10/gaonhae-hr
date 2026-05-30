## Plan

1. **Add a public list RPC for Guards purchases**
   - Create `public.get_public_guards_purchase_list(...)` as a `SECURITY DEFINER` function, matching the Competition and Seminar tabs.
   - Return the same fields the Guards tab currently needs, including branch name, buyer details, items, total, proof URL, status, variants, collection state, matched student/invoice IDs, and timestamps.
   - Exclude rejected/cancelled rows only if the current UI expects that; otherwise keep all statuses so the existing Status filter still works.

2. **Update the Guards tab to use the RPC instead of direct table reads**
   - Change `listGuardsPurchases()` in `guardsPurchaseService.ts` from `.from('guards_purchases').select('*')` to the new RPC.
   - Keep the component’s existing filters and layout, but use returned `branch_name` as a fallback so branch labels display consistently even before `useBranches()` finishes.

3. **Preserve secure write behavior**
   - Keep public/incognito view read-only unless the page is explicitly unlocked for editing.
   - Leave verify/reject/collected actions behind the existing password/edit-mode flow, and if they still rely on direct table updates later, move them to security-definer admin RPCs in the same pattern as Competition/Seminar.

4. **Verify against live data**
   - Confirm the database currently has Guards purchases; I found 5 rows, including pending Balmoral rows and a verified Jurong West row.
   - After implementation, check that `/grading-list` → Guards shows those rows in incognito/public view, while branch/status/collection/search filters still work.

## Technical note

The earlier RLS fix helps authenticated staff, but the screenshot is an unauthenticated/incognito public view. The working Competition and Seminar tabs load through `SECURITY DEFINER` RPC functions; Guards still reads `guards_purchases` directly, so anon sessions are filtered out by RLS and get an empty list.