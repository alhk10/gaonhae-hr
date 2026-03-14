

# System Refactoring and Performance Optimization Plan

## 1. Dead Code Removal

Several files are completely unused (no imports found anywhere):

| File | Reason |
|------|--------|
| `src/utils/deviceFingerprint.ts` | Zero imports across codebase |
| `src/utils/cachePreventionService.ts` | Only references itself; no external consumers |
| `src/hooks/useInactivityTimer.ts` | Zero imports |
| `src/data/employeeData.ts` | 320 lines of mock data; zero imports (all employee data comes from Supabase) |

**Action**: Delete these four files.

---

## 2. Excessive Console Logging

1,745 `console.log` calls found across 61 files. In production, these degrade performance (serialization cost) and leak internal state to browser devtools.

**Action**:
- Replace all raw `console.log`/`console.error` calls in `src/` with the existing `logger` utility (which already suppresses `debug` in production).
- In performance-critical paths (e.g. `EmployeeDashboard`, `Index.tsx`, `BranchDashboard`), remove or downgrade verbose render-cycle logs to `logger.debug`.
- Remove the `ResponsiveLayout` console.log on every render.

---

## 3. Duplicate `withTimeout` Utility

The same `withTimeout` helper is copy-pasted in both `authSessionService.ts` and `authOptimizationService.ts`.

**Action**: Extract to a shared `src/utils/asyncHelpers.ts` and import from both files.

---

## 4. Duplicate Route in App.tsx

Lines 284-293 define `/admin-slo` as an exact copy of `/admin-slot-booking`. This appears to be a typo/leftover.

**Action**: Remove the `/admin-slo` route.

---

## 5. ScreenLockContext — Disabled but Still Running

The `ScreenLockProvider` is wrapped around the entire app and calls `useScreenLock` (which sets up inactivity timers, pin-check queries), but the feature is explicitly commented out as "TEMPORARILY DISABLED" and always returns `isLocked: false`.

**Action**: Replace the provider body with a no-op passthrough that does not call `useScreenLock`, eliminating the timer and Supabase queries. Keep the context shape so consumers don't break. When the feature is re-enabled, restore the hook call.

---

## 6. PayrollContext Loaded Globally

`PayrollProvider` wraps the entire app (1,167 lines of logic, multiple `useEffect` hooks, Supabase calls on mount). It initializes payroll data on every page load, even for employees/students who never visit payroll.

**Action**: Move `PayrollProvider` from `App.tsx` to wrap only the payroll-related routes (`/payroll`, `/payment-summary`, `/increment-planning`, `/payslip-management`). Create a small layout wrapper component for these routes.

---

## 7. Auth Session Processing — Redundant Retry Logic

In `authSessionService.ts`, if the initial parallel `checkSuperadminRPC` returns false and there's no student data, it retries with a longer timeout. Then if employee data is also missing, it retries `getUserData` with a longer timeout. These sequential retries add up to 16 seconds of potential blocking on the initial auth flow.

**Action**: Increase the initial parallel timeout from 6s to 8s and remove the sequential retry block. If data isn't found in 8 seconds, accept the fallback. The session-change listener will re-process if data arrives later.

---

## 8. Dashboard Stats — Fetching Full Rows for Counts

`getDashboardStats` fetches all employee IDs and claim IDs just to count them (`.select('id')` then `.length`). `getRecentActivity` fetches all active employees then filters claims.

**Action**: Use Supabase `.select('id', { count: 'exact', head: true })` to get counts without transferring rows. For recent activity, use a single query with a join or RPC.

---

## 9. Redundant `claimsData.ts` Re-export Layer

`src/data/claimsData.ts` only re-exports from `claimsService.ts`. Two files (`Claims.tsx`, `ClaimsManagementContent.tsx`) still import from it.

**Action**: Update the two consumers to import directly from `@/services/claimsService` and delete `src/data/claimsData.ts`.

---

## 10. Route Guard Boilerplate

Every protected route in `App.tsx` repeats `<AuthGuard><PageAccessGuard requiredPermission="...">`. This is ~400 lines of repetitive JSX.

**Action**: Create a `ProtectedRoute` wrapper component:
```tsx
const ProtectedRoute = ({ permission, children }) => (
  <AuthGuard><PageAccessGuard requiredPermission={permission}>{children}</PageAccessGuard></AuthGuard>
);
```
This will reduce App.tsx by ~200 lines and make route definitions scannable.

---

## Summary of Impact

| Area | Savings |
|------|---------|
| Dead files removed | ~600 lines, 4 files |
| Console.log cleanup | ~1,700 call sites cleaned |
| PayrollContext scoping | Eliminates unnecessary Supabase calls on non-payroll pages |
| ScreenLock no-op | Eliminates timer + pin queries app-wide |
| Dashboard count queries | Reduces data transfer from full rows to header-only counts |
| Auth retry removal | Reduces worst-case auth init from ~22s to ~8s |
| Route boilerplate | ~200 lines reduced in App.tsx |

### Recommended Additions

- **React Query Devtools** (dev only): Already have `@tanstack/react-query`; add devtools for debugging stale/refetch issues.
- **Error tracking integration**: Consider Sentry or similar for production error monitoring instead of console.error.

### Files to Modify
- `src/App.tsx` (route cleanup, PayrollProvider scoping, ProtectedRoute)
- `src/contexts/ScreenLockContext.tsx` (no-op)
- `src/services/authSessionService.ts` (remove retry, extract withTimeout)
- `src/services/authOptimizationService.ts` (import shared withTimeout)
- `src/services/dashboardOptimizationService.ts` (count queries)
- `src/components/layout/ResponsiveLayout.tsx` (remove console.log)
- `src/pages/Index.tsx` (replace console.log with logger)
- `src/components/dashboard/EmployeeDashboard.tsx` (replace console.log with logger)
- `src/pages/Claims.tsx` (import from claimsService)
- `src/components/claim/ClaimsManagementContent.tsx` (import from claimsService)

### Files to Create
- `src/utils/asyncHelpers.ts`

### Files to Delete
- `src/utils/deviceFingerprint.ts`
- `src/utils/cachePreventionService.ts`
- `src/hooks/useInactivityTimer.ts`
- `src/data/employeeData.ts`
- `src/data/claimsData.ts`

