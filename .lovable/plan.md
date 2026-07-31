## What I found

Albert's reset email was never sent because he has no login account at all.

Verified in the database:
- `albertcorpuz873@gmail.com` exists as an **active student** ("ALBERT TIGGANGAY CORPUZ JR").
- There is a `student_auth` row for him created 14/07/2026, but its `auth_user_id` is **empty** — provisioning never completed.
- There is **no matching user in the authentication system** (searched `auth.users`; zero rows).
- Auth logs contain **no requests at all** for his email — password reset for an unknown address is silently accepted and no email is generated.

So the reset screen showed "check your email" while nothing was ever sent. This is not a domain/DNS or deliverability problem.

## Plan

### 1. Fix Albert now (immediate)
Provision his login account through the existing admin auth flow (`auth-admin` edge function / student auth provisioning), which creates the auth user, links `student_auth.auth_user_id`, and triggers a password-set email. Then confirm his `auth.users` row exists and `student_auth.auth_user_id` is populated.

### 2. Find every other student in the same broken state
Query `student_auth` rows with a null `auth_user_id` (and active students with an email but no auth user). Report the list so you can decide whether to bulk-provision them.

### 3. Stop the silent failure in the reset flow
In the forgot-password path, before calling the reset, check whether the email maps to a provisioned account using a `SECURITY DEFINER` RPC that returns only a boolean (never exposes emails or user lists). If it is not provisioned:
- Show a clear message: "No login has been set up for this email yet — please contact your branch to activate portal access," instead of the false "email sent" confirmation.

### 4. Harden provisioning
`createStudentAuthAccount` currently never writes back to `student_auth`, which is how Albert ended up with a row and no auth user. Update it to record `auth_user_id` on success and to surface a clear error when signup fails, so half-provisioned rows stop appearing.

## Technical notes
- Files: `src/services/studentAuthProvisioningService.ts`, the forgot-password UI component, and a new RPC `public.student_login_exists(p_email text)` returning boolean.
- No change to auth email templates or the sending domain is needed — the sending pipeline is not the cause here.
