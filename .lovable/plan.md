

## Problem Analysis

The login hangs on "Loading your workspace..." because the auth session processing runs **all queries sequentially** with long timeouts. Here's the actual flow after `signInWithPassword`:

1. `getStudentByAuthId()` — queries `student_auth` (5s timeout) — **missing index on `auth_user_id`**
2. If not student → `getUserData()` — queries `employees` (5s quick + 10s extended timeout)
3. If no userData → `checkSuperadminStatus()` — queries `superadmin_users`
4. If not superadmin → `getEmployeeBasicData()` — queries `employees` **AGAIN** (8s timeout) — completely redundant
5. If userData found → `getUserAdminAccess()` + `getUserPageAccess()` in parallel (5s + 10s each)

**Worst case: 38+ seconds of sequential waiting.** Even the happy path (employee found on first try) takes 5s student check + 5s employee check + superadmin check + admin/page access = ~15s.

Additionally, `onAuthStateChange` fires `TOKEN_REFRESHED` and re-runs the **entire flow** even when the user is already loaded.

### Root Causes
1. **Sequential queries** — student, employee, superadmin should run in parallel
2. **Redundant `getEmployeeBasicData`** — queries the same `employees` table that already timed out
3. **Missing index** on `student_auth.auth_user_id` — slows student lookup
4. **No skip on TOKEN_REFRESHED** — re-processes everything when user is already authenticated
5. **Double timeout pattern** (quick + extended) means each table gets queried twice

## Plan

### 1. Rewrite `processUserSession` with parallel queries

Run student, employee, and superadmin checks **simultaneously** using `Promise.allSettled`:

```typescript
const [studentResult, employeeResult, superadminResult] = await Promise.allSettled([
  getStudentByAuthId(authUserId, email),
  getUserData(email, authUserId),
  checkSuperadminStatus(email)
]);
```

Then use whichever resolves with data first. This cuts the sequential chain from 3 steps to 1.

### 2. Remove redundant `getEmployeeBasicData` calls

Lines 156 and 292 in `authSessionService.ts` call `getEmployeeBasicData` which queries the same `employees` table that `getUserData` already failed on. Remove these — if `getUserData` returned null, querying again won't help.

### 3. Simplify `getCurrentUserEmployee` — remove double timeout pattern

Replace the quick-then-extended pattern with a single query with a reasonable timeout (8s). This halves the number of DB round-trips.

### 4. Skip re-processing on `TOKEN_REFRESHED` in AuthContext

In `AuthContext.tsx`, when the auth event is `TOKEN_REFRESHED` and we already have a user loaded, skip the full `processUserSession` call:

```typescript
if (event === 'TOKEN_REFRESHED' && user) {
  return; // User already loaded, no need to re-query everything
}
```

### 5. Add missing database index

Create index on `student_auth.auth_user_id` to speed up student lookups.

### Files Modified

| File | Change |
|------|--------|
| `src/services/authSessionService.ts` | Parallel queries, remove redundant `getEmployeeBasicData` calls |
| `src/services/authOptimizationService.ts` | Single timeout (8s) instead of quick+extended pattern |
| `src/contexts/AuthContext.tsx` | Skip re-processing on TOKEN_REFRESHED |
| Database migration | Add index on `student_auth(auth_user_id)` |

### Why this preserves functionality
- All the same data is fetched — just in parallel instead of sequentially
- Cache logic remains intact
- Fallback chain preserved (DB → cache → defaults)
- Security fixes from previous changes untouched

