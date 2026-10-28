# Hide employees and allow "withdrawn" status in /access Students

## What changes
1. **Hide employees** — In the /access Students list, staff tagged as Employee (e.g. JINWOO CHA) are no longer shown. A small "Show employees" toggle (visible only with the all-branch password Hp97533488) lets you bring them back so you can still untag someone.
2. **Withdrawn status** — The student edit dialog's Status dropdown gains a "withdrawn" option, and staff can save it directly (no superadmin approval). The note saying "Withdrawal requires superadmin approval" is removed.

## Technical details
- `StudentsTab.tsx`: filter out `is_employee` rows by default; add an all-branch-only toggle to include them.
- `StudentEditDialog.tsx`: add `<SelectItem value="withdrawn">`, update description text.
- Migration: replace the student-update database function (latest version of the one raising "Invalid status ... withdrawal requires approval") so it accepts `withdrawn`, keeping branch-scope password checks. This supersedes the "withdrawal needs superadmin approval" rule for /access; memory will be updated.
