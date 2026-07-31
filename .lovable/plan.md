# Fix: portal switch missing for dual-access people

Albert logs in and lands straight in the Student Portal with no Employee / Branch switch.

## Cause

Two things in session handling suppress the switcher:

1. **Student fast path skips the employee check.** In `src/services/authSessionService.ts`, when the auth account's metadata says `user_type: 'student'` with a `student_id`, the session returns immediately with `availableUserTypes: ['student']` — the employee record and superadmin checks never run. Anyone provisioned as a student first (Albert was auto-provisioned from his student record) is locked to student-only, so `PortalSwitcher` gets one option and renders nothing.
2. **`'branch'` cannot persist.** In `src/contexts/AuthContext.tsx` the saved `activeUserType` is only kept if it appears in `availableUserTypes`, which never contains `'branch'`. Choosing Branch is discarded on the next load.

## What changes

- Remove the student-only shortcut: even on the metadata fast path, run the employee/superadmin lookups so `availableUserTypes` reflects both sides when the same email has an employee record.
- Also apply this to the "no employee record, linked students found" fallback so it stays consistent.
- Treat `'branch'` as always-valid when restoring the persisted portal choice; `Index.tsx` already filters it out for anyone without branch access.

## Technical notes

- `src/services/authSessionService.ts`: in the fast path, run `getUserData(email, authUserId)` and `checkSuperadminRPC(email)` alongside `getLinkedStudentsRPC(email)`. If an employee side exists, fall through to the normal employee branches (returning `userType: 'student'` as the default active type when the account is student-provisioned) with `availableUserTypes: ['employee', 'student']`. Keep the existing timeouts so login speed is unchanged.
- `src/contexts/AuthContext.tsx` (~line 106-111): accept a saved `'branch'` value as valid when restoring from `sessionStorage`.
- No database or UI component changes; `PortalSwitcher`, `RoleChooser`, and `BranchDashboardView` stay as they are.
- Verify after the change by signing in as Albert and confirming the Employee / Student switch appears above the Student Portal header.
