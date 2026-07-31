# Fix password reset link redirecting to the wrong site

## What's happening

Albert's reset email link sends him to `gaonhae-hr.lovable.app`, which shows a Lovable "page not found". The live app is `gaonhae.app` (and `gaonhae.lovable.app`).

Supabase only honours the app's requested redirect target if it matches the auth **Site URL** or one of the **Additional Redirect URLs**. When it doesn't match, it silently falls back to the Site URL — which here is still an old `gaonhae-hr.lovable.app` value from an earlier project name. That's why the link lands on a dead domain instead of the reset page.

## Fix

1. Update the backend auth settings:
   - Site URL: `https://gaonhae.app`
   - Additional redirect URLs: `https://gaonhae.app/**`, `https://gaonhae.lovable.app/**`, plus the Lovable preview URL pattern so resets keep working while testing.
2. Add a canonical app URL helper in the frontend so reset/verification links always build from `https://gaonhae.app` in production instead of whatever origin the browser happens to be on, while still using the current origin on preview/localhost.
   - Applies to: `LoginForm.tsx` (forgot password), `studentAuthProvisioningService.ts` (signup + reset), and any other `resetPasswordForEmail` / `emailRedirectTo` call sites.
3. Re-send Albert a reset email and confirm the link opens `https://gaonhae.app/auth/reset-password` and that the page accepts the recovery token.

## Notes

No database or business-logic changes; this is auth configuration plus a URL helper.
