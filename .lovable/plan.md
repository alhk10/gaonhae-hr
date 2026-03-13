

## Plan: Fix Login Page Flash on Refresh

### Root Cause
In `AuthContext.tsx`, the `onAuthStateChange` listener is set up **after** `initAuth()` starts. When Supabase fires the `INITIAL_SESSION` event, it can race with the `getSession()` call in `initAuth`. If `onAuthStateChange` fires with an event that calls `handleUserSession` and increments the sequence counter, the `initAuth` result becomes stale and gets discarded — or vice versa. This can cause a brief state where `isLoading = false` and `user = null`, which renders the login form.

### Fix in `src/contexts/AuthContext.tsx`

1. **Add an `initialLoadDone` ref** — only allow `isLoading` to be set to `false` after the initial `getSession()` call completes, not from early `onAuthStateChange` events.

2. **Reorder initialization** — set up `onAuthStateChange` BEFORE calling `getSession()` (per Supabase best practices). The listener should skip setting `isLoading = false` until `initialLoadDone` is true.

3. **In `handleUserSession`**, gate the `setIsLoading(false)` call behind a check: only set it if `initialLoadDone.current` is true. After `initAuth` finishes processing the initial session from `getSession()`, set `initialLoadDone.current = true` and then `setIsLoading(false)`.

This ensures the loading spinner stays visible until the session is fully restored and processed, preventing the brief flash of the login page.

### Files to modify
- `src/contexts/AuthContext.tsx` — reorder auth initialization, add `initialLoadDone` guard

