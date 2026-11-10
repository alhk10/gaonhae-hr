# Students tab: Active by default, sorted A–Z

In `/access` → Students:

1. The status filter starts on **Active** instead of "All statuses" (staff can still switch to All, Trial, Inactive, Withdrawn).
2. The list is sorted alphabetically by name (A–Z) instead of by class group/belt. Employees (when shown) still sit at the bottom.

## Technical details
- `src/components/grading-list/StudentsTab.tsx`: `useState('all')` for `statusFilter` → `useState('active')`.
- Replace `sortAccessStudents(...)` in `rowsAll` with a name sort (`localeCompare` on full name, case-insensitive), keeping employees last.
