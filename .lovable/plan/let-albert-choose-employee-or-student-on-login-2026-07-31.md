# Let Albert choose Employee or Student on login

## What I found

- Student record exists for `albertcorpuz873@gmail.com` (ALBERT TIGGANGAY CORPUZ JR), active.
- Employee record exists: `EMP1750865290864` — "CORPUZ ALBERT JR TIGGANGAY", display name "ALBERT CORPUZ", not resigned — but its **email is empty**.
- Dual-role detection in `authSessionService.ts` matches employee and student records **by email**. With no email on the employee row, Albert would sign in as student only and never see the Employee/Student toggle.
- The dual-role toggle itself is already built (`availableUserTypes`, `activeUserType`, mode toggle in the dashboard) — no new UI is needed once the records link up.

## Plan

### 1. Link Albert's employee record to his email
Set `employees.email = albertcorpuz873@gmail.com` on `EMP1750865290864`. This makes the existing dual-role path resolve both records, so after login he gets the Employee/Student switch.

### 2. Make sure his login exists
Confirm the auth account created in the previous fix is present and linked in `student_auth`; if not, provision it and send the password-set email.

### 3. Add a role picker at entry
Today a dual-role user lands on the employee dashboard and switches with a toggle. Change it so that when `availableUserTypes` has both roles and no choice is stored for the session, the user is shown a simple "Continue as Employee / Continue as Student" chooser before the dashboard renders. The existing toggle stays available to switch later.

### 4. Find other employees in the same state
Report active employees whose email is empty but whose name matches an active student (and vice versa), so the same silent mismatch can be cleaned up in bulk rather than one person at a time.

## Technical notes
- Data fix via migration/update on `employees`.
- New component (e.g. `src/components/auth/RoleChooser.tsx`) rendered from `src/pages/Index.tsx` when `availableUserTypes.length > 1` and `sessionStorage.activeUserType` is unset; selecting a role calls `setActiveUserType`.
- No change to `authSessionService.ts` logic itself — it already returns `['employee','student']` when both sides resolve.
