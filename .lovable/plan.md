
Goal: fix two persistent auth issues together:
1) Jason Lu repeatedly needing password recovery.
2) Login page flashing for a few seconds before dashboard after refresh.

What I found (root causes):
- Runtime logs show `refresh_token_not_found` during auth bootstrap (`/token` 400), and current auth boot logic can transiently resolve to “logged out”.
- `AuthContext` currently combines:
  - ignored `INITIAL_SESSION`,
  - manual `Promise.race` timeout in `getSession`,
  - proactive + interval `refreshSession` calls,
  which can create race conditions and temporary unauthenticated states (causing login-page flash / redirect to `/` before session settles).
- For Jason specifically, `auth.audit_log_entries` shows many `user_recovery_requested` + `login` events, but no `user_updated_password` events recently. That means recovery links are being used to sign in, but password is not being persistently changed.
- Admin reset UI (`ResetPasswordDialog`) writes to `public.user_passwords` only, not Supabase Auth (`auth.users`), so it is not a true auth password reset path.

Implementation plan:

1) Refactor auth initialization to be race-safe
- File: `src/contexts/AuthContext.tsx`
- Replace current bootstrap flow with a single, deterministic init:
  - subscribe once to auth state changes,
  - process `INITIAL_SESSION` (do not ignore),
  - run one guarded bootstrap `getSession`,
  - dedupe event/bootstrap processing with a single-flight guard.
- Remove manual periodic refresh loop and init-time forced refresh logic; rely on Supabase client auto refresh.
- Keep `isLoading=true` until initial auth state is fully resolved (no transient false).
- If bootstrap hits `refresh_token_not_found`, clear local auth state cleanly and finalize without oscillation.

2) Enforce password update when recovery session is used
- Files:
  - `src/contexts/AuthContext.tsx`
  - `src/pages/auth/ResetPassword.tsx`
  - `src/pages/Index.tsx` (minimal, only if needed for gating behavior)
- On `PASSWORD_RECOVERY` (and/or URL hash `type=recovery`) set `requiresPasswordChange=true`.
- Persist this flag in `sessionStorage` so refresh cannot bypass it.
- Clear the flag only after successful `supabase.auth.updateUser({ password })`.
- This guarantees users cannot continue to dashboard indefinitely on recovery-only sessions without setting a real password.

3) Correct admin password reset so it actually resets Auth credentials
- Files:
  - `src/components/employee/ResetPasswordDialog.tsx`
  - `supabase/functions/auth-admin/index.ts`
- Replace `user_passwords` table upsert reset flow with an `auth-admin` action that updates Supabase Auth user password (admin API).
- Keep superadmin authorization checks in edge function.
- Optionally invalidate other sessions after admin reset so user logs in with the new credential path immediately.
- Result: admin “reset password” becomes real and consistent with login system.

4) Hardening for no-login-flash behavior on refresh
- Files:
  - `src/contexts/AuthContext.tsx`
  - `src/components/auth/AuthGuard.tsx` (only if needed)
- Ensure guards never treat auth as “logged out” before bootstrap completion.
- Prevent redirect-to-home from protected routes during unresolved auth hydration.

Technical details:
- Keep async work out of direct `onAuthStateChange` callback body (fire-and-forget to internal handler) to avoid callback blocking.
- Do not rely on frequent manual `refreshSession` calls; they can rotate tokens unnecessarily and increase refresh-token race failures.
- Recovery flow will be explicitly stateful (`requiresPasswordChange`) rather than inferred only from route presence.

Validation plan after implementation:
1) Jason test:
- Trigger forgot-password once.
- Confirm forced password-change flow appears.
- Confirm successful password update.
- Log out/in with new password (no additional recovery required).
2) Refresh test:
- Refresh on `/`, `/employees`, and another protected route.
- Confirm no login form flash; only loader then destination/dashboard.
3) Token stability:
- Keep app open and refresh after some time; ensure no repeated `refresh_token_not_found` loops in console.
4) Admin reset test:
- Reset one test user via dialog.
- Verify they can sign in with reset credential and then set permanent password.

Files to modify:
- `src/contexts/AuthContext.tsx`
- `src/pages/auth/ResetPassword.tsx`
- `src/pages/Index.tsx` (if gating adjustment needed)
- `src/components/auth/AuthGuard.tsx` (if redirect guard adjustment needed)
- `src/components/employee/ResetPasswordDialog.tsx`
- `supabase/functions/auth-admin/index.ts`

Database changes:
- No schema migration required for this fix set.
