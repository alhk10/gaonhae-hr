# Employee tag and new student sort order in /access Students

## What changes
1. **Employee tag (all-branch password Hp97533488 only)**
   - New "Employee" switch in the student edit dialog, shown only when signed in with the all-branch password. Branch passwords cannot see or change it.
   - Tagged rows show an "Employee" badge.
2. **Employees are not counted as students**
   - Excluded from "Showing N students", Summary student counts (current, paid, unpaid, no invoice, monthly counts) and unpaid/no-invoice warnings in Attendance.
   - They stay in the list, search and attendance so staff can still find them.
3. **New sort order in the Students list**
   1. Students first, employees last.
   2. Class group by the most recent attended class, in this order: Little Gaonhae, Kids, Teens & Adults, Team Gaonhae. Anyone who attends Team Gaonhae plus another class is grouped under Team Gaonhae. Students with no attended class come after the groups.
   3. Belt, highest first within each group.
   4. Name A–Z as the tie-breaker.
   - Each row shows its class group as a small label.

## Assumptions to confirm
- Belt order is highest first. Say if you want lowest first.
- "Recently attended" means the last 90 days of Attended marks. Older attendance counts as no class.

## Technical details
- Migration: add `students.is_employee boolean not null default false`. Add a password-gated RPC `access_set_student_employee(password, student_id, value)` that only accepts the all-branch scope.
- Extend the Students-list RPC to return `is_employee` plus `class_group`, taken from attended `lesson_bookings` → timeslot → `lesson_class_types` name in the last 90 days, with Team Gaonhae taking priority.
- Summary and term-payment counting RPCs add `and not is_employee`.
- Add a pure `sortAccessStudents` helper in `src/utils` with tests for employee-last, Team Gaonhae priority and belt order. Use it in `StudentsTab.tsx`.
