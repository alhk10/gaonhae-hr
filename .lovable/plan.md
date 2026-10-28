# Show Display name and Certificate name in Edit Student

## What changes
- The /access **Edit Student** form gets two new boxes under First/Last name: **Display name** and **Certificate name**. Both are pre-filled with the student's saved values and can be edited and saved, stored in uppercase like other names.
- The Students list shows them under the student's name when they differ from the legal name (e.g. "Display: LI CHIN LAK · Cert: …"), so staff can see who "LI CHIN LAK" really is.
- Clean up the old "Withdrawal requires superadmin approval" note if it still appears.

## Technical details
- `StudentEditDialog.tsx`: add `editDisplay` / `editCert` state, initialised from the row; send them on save.
- `studentDirectoryService.ts` / `adminUpdateStudentBasic`: pass `p_display_name`, `p_certificate_name`; make sure the directory query returns `display_name`, `certificate_name`.
- Migration: extend `admin_update_student_basic` with optional `p_display_name` / `p_certificate_name` (NULL = unchanged, empty = clear), uppercase them, and log changes to `student_change_logs`. Drop the old function signature so there is only one version.
