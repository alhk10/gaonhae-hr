## Goal
Add a superadmin-only **Duplicate Students** tool under Settings that detects likely duplicate student records, lets the admin review them in groups, and merges them into a single "kept" student (chosen by most recent activity) while transferring all related records from the duplicates.

## 1. New Settings tab: "Duplicates"

**File:** `src/pages/Settings.tsx`
- Add a new `<TabsTrigger value="duplicates">Duplicates</TabsTrigger>` and matching `<TabsContent>` rendering `<DuplicateStudentsManager />`.

**File:** `src/components/settings/DuplicateStudentsManager.tsx` (new)
- Top bar: "Scan for duplicates" button + match-criteria toggles (Name, Phone, Email, DOB+Name — all on by default; multi-select).
- Calls `findDuplicateStudentGroups(criteria)` and renders each group as a card:
  - Side-by-side compact table of all candidate students in the group: name, phone, email, DOB, branch, belt, status, last activity date, counts (invoices / enrollments / attendance / grading).
  - Auto-highlights the student with the most recent activity as the **"keep"** row (radio button — admin can override).
  - "Merge group" button → confirmation dialog summarising what will move and which records will be deleted, requires typing `MERGE` to confirm.
- After a successful merge, the group disappears and a toast confirms counts moved.

## 2. Detection service

**File:** `src/services/duplicateStudentService.ts` (new)

`findDuplicateStudentGroups(criteria)`:
- Calls a new SECURITY DEFINER RPC `find_duplicate_students(criteria jsonb)` that returns groups of `students.id` with a `match_reason` (`name` | `phone` | `email` | `dob_name`) per group.
- Normalisation inside the RPC:
  - Name: `upper(trim(first_name)) || ' ' || upper(trim(last_name))`
  - Phone: digits only, last 8 chars (handles +65/+61 prefixes per existing memory)
  - Email: `lower(trim(email))` (ignore null/empty)
  - DOB+Name: `date_of_birth` not null AND normalized name match
- Only considers non-withdrawn students by default (configurable).
- Excludes single-row "groups".

`getDuplicateGroupDetails(studentIds[])`:
- Fetches profile + activity counts + last-activity timestamps in one call per student (invoice updated_at, attendance date, enrollment updated_at, grading updated_at, student_registrations created_at). Returns one row per student with `last_activity_at = greatest(...)`.

`mergeStudents(keepId, dropIds[], options)`:
- Calls SECURITY DEFINER RPC `merge_students(keep_id uuid, drop_ids uuid[])` that performs the transfer atomically (see §3). Returns counts moved per table.

## 3. Merge RPC (single transaction)

**Migration:** new SQL migration adds `public.merge_students(keep_id uuid, drop_ids uuid[]) returns jsonb`, plus `public.find_duplicate_students(criteria jsonb) returns table(...)`. Both are SECURITY DEFINER, guarded by `has_role(auth.uid(), 'superadmin')`.

`merge_students` does, in order:

1. Re-point all FK references from `drop_ids` → `keep_id` in these tables (UPDATE … SET student_id = keep_id WHERE student_id = ANY(drop_ids)):
   - `invoices`, `invoice_items` (via parent), `payments`, `student_credits`
   - `student_class_enrollments`, `student_scheduled_classes`, `class_attendance`, `attendance`
   - `entitlements`, `grading_registrations`, `student_grading_history`, `grading_payment_submissions`, `competition_payment_submissions`, `seminar_payment_submissions`, `guards_purchases`
   - `notice_payments`, `student_change_logs`, `student_update_requests`, `student_withdrawal_requests`, `student_emergency_contacts`, `student_medical_notes`, `student_notification_subscriptions`, `student_branch_chats`, `student_auth`, `documents` (where linked).
2. For unique constraints that would collide (e.g. one active enrollment per term/branch, unique grading rows, `student_auth.email`): de-duplicate by keeping the row with the most recent `updated_at`/`created_at` on the kept student and deleting the loser before the UPDATE; log to `student_change_logs`.
3. Update the **kept** student's profile with the latest non-null values across the group on a field-by-field basis (using each duplicate's `updated_at` to pick newest). Names re-uppercased; statuses lowercased; empty strings → null (per existing data integrity rule). Never overwrites with null.
4. Insert one summary row per dropped student into `student_change_logs` with `change_type='merge'` recording the source id and field diffs.
5. `DELETE FROM students WHERE id = ANY(drop_ids)`.
6. Returns `{ moved: { invoices: n, payments: n, ... }, deleted: drop_ids.length }`.

If any step fails the whole transaction rolls back.

## 4. "Latest" tie-breaker

Inside `find_duplicate_students` each candidate's `last_activity_at` is computed as `greatest(students.updated_at, max(invoices.updated_at), max(class_attendance.attendance_date), max(student_class_enrollments.updated_at), max(grading_registrations.updated_at), max(student_registrations.created_at))`. The UI pre-selects the row with the max `last_activity_at` as "keep"; admin can override.

## 5. Access control
- Settings page already restricts to `userrole === 'superadmin'`.
- Both RPCs check `has_role(auth.uid(), 'superadmin')` and `RAISE EXCEPTION` otherwise.

## Out of scope
- Auth user (`auth.users`) merge — only `student_auth` is re-pointed. If two duplicates have separate auth accounts the admin gets a warning to handle auth separately.
- No bulk auto-merge across all groups; merges are one group at a time to keep them auditable.
- No undo (the change log retains the source data for manual recovery).

## Files touched
- new `src/components/settings/DuplicateStudentsManager.tsx`
- new `src/services/duplicateStudentService.ts`
- edit `src/pages/Settings.tsx` (add tab)
- new migration: `find_duplicate_students` + `merge_students` RPCs
