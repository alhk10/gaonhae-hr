# Track /access password sign-ins

## Current situation
- Hp88769491 opens **Jurong West**; Hp84128821 opens **Yishun**. Both are full staff passwords, not view-only.
- /access does not save a record when someone signs in with a password, so there's no way to tell when either password was last used.

## What to build
1. Every time someone signs in on /access, save the time and which password and branch they used. Only a label for the password is saved, never the password itself.
2. Add a "Last used" column to the Passwords tab, which only Hp97533488 can see, showing each password's most recent sign-in in DD/MM/YYYY HH:mm (Perth/Singapore time).
3. Add a small "Recent sign-ins" list to the same tab with the last 50 sign-ins.

## Technical details
- New `access_unlock_log` table (password row id, branch_id, unlocked_at). RLS stays on and there are no public grants; only SECURITY DEFINER functions can write to it.
- `access_unlock` inserts a log row each time a sign-in succeeds.
- New function `access_password_last_used(all_branch_password)` returns the sign-in times and is gated the same way as the other access_password_* functions.

Past sign-ins can't be recovered. Tracking starts once this goes live.
