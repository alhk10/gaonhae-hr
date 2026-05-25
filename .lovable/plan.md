## Merge `/guardspurchase-list` into `/grading-list` with tabs

### Goal
Single page at `/grading-list` with two tabs — **Grading** and **Guards** — replacing the standalone `/guardspurchase-list`. Access restricted to passwords `Hp97533488` and `Hp84311884`.

### Changes

**1. `src/pages/public/PublicGradingList.tsx`**
- Wrap the existing main content in a shadcn `Tabs` component with two `TabsTrigger`s: "Grading" (default) and "Guards".
- Tab 1 (Grading) renders the current page contents unchanged.
- Tab 2 (Guards) renders the `<PublicGuardsPurchaseList />` component (imported), so all existing guards functionality is reused as-is.
- Tabs sit just under the page title; the existing unlock gate (`unlockLevel`) stays as the outer wrapper covering both tabs.

**2. `src/pages/public/PublicGuardsPurchaseList.tsx`**
- Update the password check to accept both `Hp97533488` and `Hp84311884` (currently only the first). This keeps the component usable both standalone and embedded.
- No layout/behavior changes otherwise.

**3. `src/App.tsx`**
- Keep `/guardspurchase-list` route as a redirect to `/grading-list` (using `<Navigate to="/grading-list" replace />`) so any existing bookmarks/links still work and land on the merged page (Grading tab default; users click Guards tab).
- Hostname-aware root (`gradinglist.*`) already points to `PublicGradingList` — unchanged.

### Notes
- Both passwords are already constants in `PublicGradingList.tsx` (`ADMIN_UNLOCK_PASSWORD`, `ADMIN_FULL_UNLOCK_PASSWORD`); access restriction requirement is already met there.
- No DB / service / RLS changes.
- No edits to shared services or other pages.
