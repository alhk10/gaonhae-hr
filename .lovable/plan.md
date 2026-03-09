

## Problem

After the security fix that removed static PII fallbacks, login is extremely slow or hangs on "Loading your workspace..." indefinitely.

**Root cause**: The `employees` table has two SELECT RLS policies. One calls `get_current_user_role()` which internally queries `superadmin_users` AND joins `admin_access` with `employees`. This makes every employee lookup slow. The code uses aggressive timeouts (800ms quick, 3000ms extended) that both expire before the query completes, returning `null` and leaving the user without employee data.

Previously, the static fallback maps masked this by returning hardcoded data instantly when the DB was slow. Now that they're removed (correctly, for security), the real DB performance issue is exposed.

## Fix

### 1. Increase query timeouts in `authOptimizationService.ts`

- Quick check timeout: 800ms -> **5000ms**
- Extended query timeout: 3000ms -> **10000ms**

These queries only run on login/token refresh, not on every page load, so longer timeouts are acceptable.

### 2. Increase query timeouts in `authSessionService.ts`

- `getEmployeeBasicData` timeout: 2000ms -> **8000ms**
- Student auth lookups: 2000ms -> **5000ms**

### 3. Remove redundant second employee query

In `authSessionService.ts` lines 156, when `getUserData` returns null, it calls `getEmployeeBasicData` which queries the same `employees` table again. Instead, if `getUserData` already failed due to timeout, we should just proceed with the superadmin check result rather than re-querying.

### Files Modified

| File | Change |
|------|--------|
| `src/services/authOptimizationService.ts` | Increase timeouts from 800ms/3000ms to 5000ms/10000ms |
| `src/services/authSessionService.ts` | Increase timeouts from 2000ms to 5000ms-8000ms |

### Why this preserves functionality
- No logic changes, only timeout values
- All database queries and caching remain identical
- Security fixes (removed PII) stay intact

