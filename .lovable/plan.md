## Goal

A person who exists both as an employee and as a student should be able to use both dashboards from one login. Today the session resolver returns a single `userType`, and the student check wins — so an employee who is also a student is locked into the student portal (and vice versa, an employee record hides the student portal).

## Behaviour

- After login, a dual-role person lands on the **employee dashboard**.
- A small **Employee / Student toggle appears in the top header** whenever both roles exist. Single-role users see no toggle and nothing changes for them.
- Switching to Student mode shows the existing student portal (including the multi-student switcher when their email is linked to more than one student). Switching back returns to the employee dashboard.
- The chosen mode persists for the browser session, so a refresh doesn't bounce them back.

## Technical changes

**Session resolution (`src/services/authSessionService.ts`)**
- Stop treating student and employee as mutually exclusive. Run the student, employee and superadmin lookups as today, but return both sides when present: keep `userrole`/`userDetails`/`adminAccess`/`pageAccess` for the employee side and `linkedStudents`/student details for the student side.
- Add `availableUserTypes: UserType[]` to `SessionResult`. `userType` stays as the default/primary type, set to `employee` when both exist (matching the chosen default), `student` when only student data is found.
- Keep the JWT fast path for student-only accounts (portal-provisioned logins) unchanged, since those never have an employee record.

**Auth context (`src/contexts/AuthContext.tsx`, `src/types/auth.ts`)**
- Expose `availableUserTypes`, an `activeUserType`, and `setActiveUserType(type)`.
- `activeUserType` initialises from `sessionStorage` (key e.g. `activeUserType`) when valid, otherwise the default type; it is cleared on logout alongside the other session keys.

**Routing / UI**
- `src/pages/Index.tsx`: switch on `activeUserType` instead of `userType` when deciding between the student portal and the employee dashboards.
- `src/components/layout/Sidebar.tsx`: the `userType === 'student'` branch reads `activeUserType`.
- New small `DashboardModeToggle` component rendered in `src/components/layout/Navbar.tsx` (employee mode) and above the student portal header in `Index.tsx` (student mode), shown only when `availableUserTypes.length > 1`.

**Data assumption to verify first**
The link between an employee and a student record is by email. Before wiring the toggle, confirm with a query that dual-role people share the same email across `employees` and `students` / `student_auth`. If they don't, matching will need an explicit link and the plan's first step becomes adding that link instead.

## Out of scope

No changes to RLS, permissions, or what either dashboard shows. Student-side data still resolves through the existing student RPCs, so a person in student mode only ever sees students linked to their own email.
