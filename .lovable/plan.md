# Fix the duplicate-student scan error

## What's wrong

The Duplicates screen fails with "function public.has_role(uuid, unknown) does not exist". Both the duplicate scan and the merge action check superadmin rights with a helper that was never created in this project. Since the check itself errors out, nothing can run — not the scan, not the merge.

Confirmed by inspecting both database routines: `find_duplicate_students` and `merge_students` each begin with a call to that missing helper.

## The fix

Swap the missing check for the superadmin check this project already uses everywhere else (the active list of superadmin emails), in both routines:

- `find_duplicate_students` — scan for duplicates
- `merge_students` — merge the selected records

Everything else in the two routines stays exactly as-is. No screen changes needed.

## Verification

- Run the scan as a superadmin and confirm duplicate groups load (or an empty result with no error).
- Confirm a non-superadmin still gets refused.
