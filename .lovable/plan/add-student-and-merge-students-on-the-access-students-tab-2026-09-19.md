# Add Student and Merge Students on the /access Students tab

Two new buttons appear above the student list, visible only after unlocking with the edit password.

## Add Student

Opens a compact dialog asking for the essentials:

- First name, last name (saved in capitals)
- Date of birth (day / month / year pickers, same style as the public forms)
- Gender (male / female / other)
- Email, mobile
- Branch, belt (optional, "No belt" allowed)
- Status (active / trial / inactive)

On save the student is created immediately, gets a student number, and shows up in the list straight away. Duplicate guard: if a student with the same name and birth date already exists, the dialog warns and asks for confirmation before creating.

## Merge Students

Opens a dialog that scans for likely duplicates (same name, same mobile, same email, same birth date + name) and shows each group with all its records side by side, including how many invoices, enrolments, attendances and gradings each one has, plus last activity.

Staff choose which record to keep and submit a merge request. Nothing is merged at that moment — the request goes to the superadmin dashboard for approval, since merging cannot be undone. Once a superadmin approves, all related records move to the kept student and the duplicates are removed. Superadmins can also reject with a reason.

A pending request is shown on the group so the same merge cannot be submitted twice.

## Superadmin side

A new "Student merge requests" section on the superadmin dashboard lists pending requests: who requested it, the record to keep, the records to be removed, their contact details and record counts, with Approve and Reject buttons. The pending count joins the existing approval counters.

## Technical notes

Database:
- New table `student_merge_requests` (keep_id, drop_ids, requested_by, status, reviewed_by, reviewed_at, rejection_reason, snapshot of the group), with grants, RLS, and an anon insert path only through the RPC below.
- `public_request_student_merge(p_keep_id, p_drop_ids, p_actor)` — SECURITY DEFINER, validates the ids and blocks duplicate pending requests.
- `approve_student_merge_request(p_request_id, p_actor)` — superadmin-only, calls the existing `merge_students` logic internally with elevated rights; `reject_student_merge_request(p_request_id, p_actor, p_reason)`.
- `public_find_duplicate_students(p_criteria)` — SECURITY DEFINER wrapper around the existing duplicate-scan query without the `has_role` superadmin gate, granted to anon/authenticated, returning the same rows plus record counts so the /access dialog does not need direct table reads.
- `admin_create_student_public(...)` — SECURITY DEFINER insert into `students` (uppercased names, normalised phone, blocked-email check reused, status limited to active/trial/inactive), assigns student number via the existing trigger, logs to `student_change_logs`.

Frontend:
- `src/services/studentDirectoryService.ts` — add `createStudentPublic`, `findDuplicateStudentsPublic`, `requestStudentMerge`.
- New `src/components/grading-list/AddStudentDialog.tsx` and `src/components/grading-list/MergeStudentsDialog.tsx`, reusing the compact dialog conventions already used on /access (h-9 inputs, text-xs, max-w-[95vw]).
- `src/components/grading-list/StudentsTab.tsx` — add the two buttons in the filter row, gated on `canEdit`, and invalidate `public-student-directory` after a create.
- New `src/components/dashboard/StudentMergeApprovals.tsx` plus a service, wired into `SuperadminDashboard.tsx` alongside the other approval sections.
