# Portal switcher on every dashboard

Add one consistent switch control (Student / Employee / Branch) shown on each dashboard, visible only for people who actually have more than one kind of access.

## What the user sees

- A small segmented switch pinned at the top of the dashboard area, with up to three options:
  - **Employee** — the staff dashboard (only if the person has an employee record)
  - **Student** — the student portal (only if their email is linked to a student record)
  - **Branch** — the branch dashboard (only if they have branch access, or are superadmin)
- If a person only has one kind of access, no switch appears at all (unchanged experience).
- The chosen mode sticks for the session, so navigating around does not reset it.
- When Branch is selected and the person can access more than one branch, a branch dropdown appears next to the switch; a single-branch person is auto-selected.
- The existing first-login role chooser stays, and gains the Branch option when applicable.

## Technical notes

- New `PortalSwitcher` component (in `src/components/dashboard/`) rendering a segmented control from a computed list of available modes.
- Extend `UserType` in `src/types/auth.ts` to `'employee' | 'student' | 'branch'`; `activeUserType` in `AuthContext` already persists to `sessionStorage`, so the branch mode persists the same way. Selected branch id persists alongside it.
- Availability:
  - employee: `availableUserTypes` includes `'employee'`
  - student: `availableUserTypes` includes `'student'`
  - branch: `useBranchAccess().hasAccess` or `userrole === 'superadmin'`
  - `authSessionService` keeps returning employee/student only; branch is layered on client-side from branch access so no auth changes are needed.
- `src/pages/Index.tsx`: replace the inline `ModeToggle` with `PortalSwitcher`, and route `effectiveType === 'branch'` to `BranchDashboard` (reusing the branch selection logic already in `BranchDashboardPage.tsx`, extracted into a small `BranchDashboardView` component so both the page and Index use it).
- `src/components/auth/RoleChooser.tsx`: accept a dynamic list of options so Branch can appear as a third card.
- Superadmin's existing `DashboardSwitcher` tabs stay as-is; the new switcher is suppressed for superadmins on the overview to avoid two overlapping controls.
