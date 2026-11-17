# Branch dropdown in Attendance settings

Add a branch picker at the top of the Attendance settings pop-up so staff can switch which branch's timetable, classes, terms and toggles they are editing without closing it.

## Behaviour
- Dropdown sits under the "Attendance settings" title, defaulting to the branch currently shown on the Attendance page.
- Lists only the branches the current password can access (branch passwords see their own branch(es); the all-branch password sees all).
- Changing it reloads every setting in the pop-up (Progress cards, Mute unpaid warnings, Calendar as Term, Timetable, Classes, Terms) for that branch.
- Closing the pop-up keeps the Attendance page on its own branch; it is not changed by the pop-up choice.
- Unsaved edits (open term/class form) are cleared when switching branch.

## Technical details
- `AttendanceSettingsDialog.tsx`: add `branches` prop; keep local `selectedBranch` state initialised from `branchId` on open; replace all internal uses of `branchId` with `selectedBranch`; render shadcn `Select` when `branches.length > 1`.
- `AttendanceTab.tsx`: pass the same `branches` list (or just the locked branch) used by its own branch picker.
- Existing server checks (`_settings_guard` / access scope) still block saving to branches outside the password's scope.
