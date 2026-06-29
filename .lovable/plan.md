## Reinstate Albert as active employee — but keep Klara portal access revoked

Target: `EMP1750865290864` — CORPUZ ALBERT JR TIGGANGAY.

### Current state
- `public.employees`: row exists, `email` cleared, `resign_date = 2026-06-29`.
- `auth.users`: no row for `albertcorpuz873@gmail.com` (login already revoked).
- `public.student_auth`: no row.

### Change (data-only, one update)
Update `public.employees` where `id = 'EMP1750865290864'`:
- `resign_date → NULL` (he is still employed)
- `email` stays **NULL** (do not restore `albertcorpuz873@gmail.com`)

That's the entire change.

### Why this keeps him out of Klara
Login resolves `auth.users.email → employees.email` in `processUserSession`. With no `auth.users` row for that address AND no `employees.email` to match against, there is no path to a Klara session for him. He appears in active staff lists, payroll, attendance, etc., exactly like any other employee without a portal login.

### Not changed
`auth.users`, `student_auth`, `superadmin_users`, `admin_access`, `employee_page_access`, RLS, edge functions, frontend code, payroll history, attendance history.

### Out of scope
Giving him a new Klara email later (separate request), other employees, back-pay for the days marked resigned.
