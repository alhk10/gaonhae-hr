
# Final security wrap-up

## 1. Realtime channel authorization (lock by topic prefix)

Migration adds RLS on `realtime.messages` with topic-prefix rules:

| Topic prefix | Who can subscribe |
|---|---|
| `student:<id>` | Owning student (via `student_auth`) + branch staff with access to that student's branch |
| `branch:<id>` | Superadmin + employees with `employee_branch_access` for that branch |
| `employee:<id>` | The employee themself + superadmin |
| `superadmin:*` | Superadmin only |
| `public:*` | Any authenticated user (for non-sensitive broadcasts) |
| anything else | Denied |

Implementation uses `realtime.topic()` and a SECURITY DEFINER helper `public.can_subscribe_topic(topic text)`. INSERT policy on `realtime.messages` calls it.

**Code follow-up:** Audit `supabase.channel(...)` calls — any that don't already use a `student:`, `branch:`, `employee:`, or `public:` prefix will silently stop receiving messages. I'll grep, list them, and rename them in the same change.

## 2. password_history — block all client SELECT

Migration:
- Drop existing SELECT/INSERT policies on `password_history`.
- Add `REVOKE SELECT, INSERT, UPDATE, DELETE ON public.password_history FROM authenticated, anon`.
- Create SECURITY DEFINER RPCs:
  - `check_password_history(p_email text, p_hash text) RETURNS boolean` — true if hash matches any of the last N entries.
  - `add_password_to_history(p_email text, p_hash text, p_salt text) RETURNS void` — caller must match `auth.email()` or be superadmin; trims history to last 5.

**Code follow-up:** update `src/services/securityService.ts`:
- `checkPasswordHistory()` → `supabase.rpc('check_password_history', { p_email, p_hash })`
- `addPasswordToHistory()` → `supabase.rpc('add_password_to_history', ...)`

## 3. Public registration — leave as-is

Marked as ignored in the scanner with reason "Public student registration is an intentional product feature; abuse will be addressed reactively."

## 4. Dashboard / DBA toggles — checklist for you

Output a final summary with direct dashboard links for the three you must do yourself:

- **Postgres upgrade** → https://supabase.com/dashboard/project/qwdcbfnuywgubumlgscy/settings/infrastructure → "Upgrade project". Backup first; ~2 min downtime.
- **Leaked password protection** → https://supabase.com/dashboard/project/qwdcbfnuywgubumlgscy/auth/providers → Email → toggle "Prevent use of leaked passwords".
- **Extension in public schema** → Run in [SQL Editor](https://supabase.com/dashboard/project/qwdcbfnuywgubumlgscy/sql/new):
  ```sql
  CREATE SCHEMA IF NOT EXISTS extensions;
  ALTER EXTENSION pg_net SET SCHEMA extensions;  -- (or whichever extension is flagged)
  ```
  I'll detect which extension first and give the exact statement.

## Order of execution

1. Migration: realtime RLS + password_history lockdown + revoke/RPCs.
2. Update `securityService.ts` to use the new RPCs.
3. Audit and rename `supabase.channel()` calls to the new topic naming convention.
4. Mark `student_registrations` finding as ignored with justification.
5. Print the dashboard checklist (Postgres upgrade, leaked password protection, extension move SQL).
