# Fix: Hp89891504 can't unlock /access

## Cause (confirmed)
- The password is saved correctly in the database for Carpe Diem Stradia.
- But the /access unlock screen doesn't ask the database. It checks a fixed list of passwords written into the page itself, and Hp89891504 isn't on that list. This also means any password added in the new Passwords tab would fail the same way.

## Fix
- Unlocking checks the password with the database, which returns the branches it opens, or "all branches".
- Remove the fixed password list from the page, so the Passwords tab becomes the only place passwords are set.
- Existing passwords keep working unchanged: Hp97533488, Bukit Merah + Carpe Diem, and the other branches.
- A wrong password still shows "Incorrect password".

## Technical details
- New SECURITY DEFINER `access_unlock(p_password)` returns `{ is_all, branch_ids[] }` using `_access_scope`; raises on a bad password.
- `handleUnlock` in `PublicGradingList.tsx` becomes async and calls it; remove `BRANCH_UNLOCK_PASSWORDS` / `ADMIN_UNLOCK_PASSWORD` constants (check other files with `rg`).
- Verify by unlocking with Hp89891504 in Playwright and confirming Carpe Diem Stradia is the locked branch.
