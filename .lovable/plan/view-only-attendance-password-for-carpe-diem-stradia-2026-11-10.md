# View-only attendance password for Carpe Diem Stradia

## What the user gets
- Password **Hp87783395** unlocks `/access` for **Carpe Diem Stradia only**.
- Only the **Attendance** tab shows. All other tabs are hidden.
- Attendance is read-only: you can see the week, classes and students on each slot, but you can't mark Present, add or remove students, copy rosters, change settings, or open progress cards to edit.
- Student names can't be clicked, so no student profile opens.
- The **Report** button (progress report PDF download) still works.

## Technical details
- Migration: add a `view_only` boolean (default false) to `access_unlock_passwords`; insert a sha256-hashed row for Hp87783395 mapped to Carpe Diem Stradia with `view_only = true`.
- `access_unlock` returns `view_only` in its result.
- Server enforcement: a helper `_access_is_view_only(p_password)`; every attendance write RPC (`access_attendance_add/mark/remove/review/settings` save, timetable/term/class upserts, progress card upsert, mute setting, copy) raises "View-only access" when true. Read RPCs (`access_attendance_week`, `access_progress_report`, students list) stay allowed. Also block all other write RPCs that use `_access_scope` via the same check in `_access_scope`-based write paths most likely reachable (invoice, payment, student edits).
- Password manager: show a "View only" toggle so the all-branch password can manage this flag.
- Frontend (`PublicGradingList.tsx`, `AttendanceTab.tsx`): store `viewOnly` from unlock; when true render only the Attendance tab, hide Settings/add/copy/mark controls, render attendance buttons as static badges, render names as plain text, keep Report button.
