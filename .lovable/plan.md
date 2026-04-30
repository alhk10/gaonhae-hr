## Confirmed findings

- The database still contains the employees. I checked `employees`: there are 28 total employees, including 12 full-time and 16 casual.
- `alhk10@gmail.com` is still `SENIOR PARTNER` and is also active in `superadmin_users`.
- Chloe was added as a casual employee correctly.
- The screenshot showing only Chloe is not a data-loss issue.

## Root cause

When adding Chloe, the app created Chloe's Supabase Auth account by calling `supabase.auth.signUp()` from the browser.

That client-side signup automatically replaced the current browser session with Chloe's new session. Once the browser was logged in as Chloe, row-level security correctly hid the other employees.

## Additional issue to include

Even after signing back in as `alhk10@gmail.com`, React Query can still reuse the cached `['employees']` result that was fetched while the browser was Chloe. That cached result contains only Chloe, so Party Management can continue showing only Chloe until the cache is refreshed or the page is hard-reloaded.

## Implementation plan

### 1. Move new-auth-user creation to the existing admin edge function

Update `supabase/functions/auth-admin/index.ts` to support admin-only user creation without touching the caller's session.

Add actions:

- `check_user_exists`
  - Input: `{ email }`
  - Uses `auth.admin.listUsers()` with the service role.
  - Returns whether the user already exists.

- `create_user`
  - Input: `{ email, name, employeeId }`
  - Uses `auth.admin.createUser()` with a secure temporary password.
  - Does not sign the new user into the current browser.
  - Sends the password reset / set-password email to the new employee.

The edge function already verifies the caller is a superadmin, so this keeps auth creation server-side and secure.

### 2. Replace browser `signUp()` calls in employee auth creation

Update `src/services/bulkUserCreationService.ts`:

- Replace `checkIfUserExists()` so it calls the `auth-admin` edge function instead of attempting a signup.
- Replace `createAuthUser()` so it calls the `auth-admin` edge function instead of `supabase.auth.signUp()`.
- Keep the current return shape and logging so existing employee creation flows continue working.

This fixes:

- Add single employee from Party Management / Employees.
- Bulk auth user creation.
- Future employee additions.

### 3. Clear query caches when the authenticated user changes

Update the app auth/session handling so user-specific cached data cannot survive across account switches.

Use a small bridge component inside `QueryClientProvider` and `AuthProvider` that watches the current authenticated email/user id and clears React Query cache when it changes.

This ensures:

- If the browser switches from Chloe back to Alvin, cached Chloe-only `['employees']` data is discarded.
- Party Management refetches employees as `alhk10@gmail.com`.
- Full-time and casual employees reappear without needing a hard reload.

### 4. Recovery guidance after deployment

After the fix is deployed:

1. Sign out.
2. Sign in again as `alhk10@gmail.com`.
3. Open Party Management.

The Full-time and Casual counts should return to the full dataset instead of showing only Chloe.

## Files to change

- `supabase/functions/auth-admin/index.ts`
- `src/services/bulkUserCreationService.ts`
- `src/App.tsx` or a small new auth-query-cache bridge component

## What will not be changed

- No employee records will be modified.
- No Chloe record deletion is needed.
- No RLS policy change is needed.
- No Party Management layout change is needed.
