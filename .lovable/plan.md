## Diagnosis

Jason's account (`jasonlulijie@gmail.com`, auth id `11c639c2-3e7e-468a-a8f4-a81ed7aedc6c`) is healthy at the auth layer:

- Email confirmed, not banned, has an `encrypted_password`.
- `auth.users.updated_at` = 2026-05-05 15:13 → password was changed yesterday.
- `recovery_sent_at` = NULL → **no password recovery email was ever sent** for this account.
- `last_sign_in_at` = 2026-03-15 → he has not successfully logged in since the change.
- `user_passwords`: `failed_attempts=0`, `locked_until=NULL`, `must_change_password=false` — no app-level lock.

Conclusion: the password really was updated server-side (almost certainly via the `auth-admin` edge function's `reset_password` action used by a superadmin), but the value Jason is now typing does not match what is stored. The "Forgot password email" he remembers either was never actually sent or the link was used by someone else / replaced by a later admin reset. The "Invalid login credentials" toast comes straight from `supabase.auth.signInWithPassword`.

## Fix plan

### 1. Immediate recovery for Jason

Issue a fresh password via the existing superadmin tooling (Bulk User Creation Manager → "Reset Password" for `jasonlulijie@gmail.com`). This:
- Calls `auth-admin` `reset_password` → `auth.admin.updateUserById` with the new password.
- Globally signs him out of all sessions.
- Communicate the new temporary password directly (out-of-band), and ask him to log in and change it from Profile.

Alternative: trigger the standard "Forgot password" email from the login screen for him, and confirm he opens it in the **same browser** where he requests it (implicit flow requires that). If he opens it in a different browser/email app, `setSession` from the hash succeeds but the email-app browser is the one logged in.

### 2. Make future password resets unambiguous

Three small product changes so this cannot recur silently:

**a. Surface "last password change" + source in the admin reset UI.** When a superadmin opens Jason's row in `BulkUserCreationManager`, show `auth.users.updated_at` and the last admin who reset it (we already log via `log_security_event` — display the most recent `password_reset` event).

**b. Always send a notification email on password change.** Edge function `auth-admin` `reset_password` should, after `updateUserById`, send a transactional email ("Your password was reset by an administrator. If this wasn't expected, contact support.") so the user is never confused about which password is current.

**c. Forgot-password UX hardening on `/auth/reset-password`.** The page already supports both hash tokens and `PASSWORD_RECOVERY` events, but:
- Add explicit messaging: "Open this link in the same browser where you requested it."
- After successful update, also call `auth-admin` to globally sign out other sessions (defense in depth).

### 3. Verify and monitor

- After Jason logs in once, query `auth.users.last_sign_in_at` to confirm.
- Add a tiny diagnostic in `LoginForm` (only in dev/superadmin impersonation) that shows the raw Supabase error code, so future "invalid credentials vs not confirmed vs rate-limited" cases are distinguishable at a glance.

## Technical details

Files touched if you approve:

- `src/components/admin/BulkUserCreationManager.tsx` — show "Password last changed" column from `auth.users.updated_at` (via a new `auth-admin` action `get_user_meta`), and the last reset actor from `security_audit_log`.
- `supabase/functions/auth-admin/index.ts` — 
  - new `get_user_meta` action returning `last_sign_in_at`, `updated_at`, `email_confirmed_at`.
  - in `reset_password`, after success, send notification email via existing `send-approval-email` (or a new `send-password-reset-notice`) function.
  - log `password_reset` to `security_audit_log` with the acting superadmin's email.
- `src/pages/auth/ResetPassword.tsx` — add same-browser hint; on success, invoke `auth-admin` `signout_all` for the user.
- No DB migration required.

## Out of scope

- Changing the auth flow type (currently `implicit`, which is the right call for email-app compatibility per `client.ts`).
- Migrating off the custom `user_passwords` table — it's only used for lockout/complexity bookkeeping, not for actual auth.

## Action you can take right now (no code change needed)

1. Open the superadmin Bulk User Creation page → reset Jason's password to a known value.
2. Send him the new password through a trusted channel.
3. Ask him to log in once and change it from Profile.

If that works, we proceed with steps 2 and 3 above to prevent recurrence.
