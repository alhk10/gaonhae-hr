## Issue

The screenshot is from the **Branch Dashboard grading tab**, not the public grading list. This path still builds certificate PDFs from `BranchGradingList` rows. In that component, existing grading registrations currently set:

```ts
current_belt: reg.current_belt || student.current_belt
```

Because `reg.current_belt` is the old registration snapshot (`Yellow Tip`), it wins over the live student record (`White`). The earlier fix only covered the public grading list certificate path.

## Plan

1. **Fix branch grading row belt source**
   - In `src/components/dashboard/BranchGradingList.tsx`, change registered rows to prefer the live student belt:
     ```ts
     current_belt: student.current_belt || reg.current_belt
     ```
   - This will make the visible Belt badge and certificate PDF use `White` after the student record is corrected.

2. **Refresh grading list after student belt mass edit**
   - In `src/components/dashboard/BranchDashboard.tsx`, after saving student mass edits, also invalidate/refetch the grading list queries:
     ```ts
     ['grading-list-students', branchId]
     ```
   - This prevents the grading tab from keeping a cached `Yellow Tip` row after changing the student belt.

3. **Keep certificate logic unchanged otherwise**
   - `runCertificate` and bulk certificate generation can keep using `student.current_belt`, because after step 1 that field will represent the live student belt.
   - No database migration is needed for this specific branch-dashboard issue.

4. **Verify**
   - Confirm the code no longer lets `grading_registrations.current_belt` override `students.current_belt` in the branch grading certificate flow.
   - Confirm the affected query is invalidated when a student belt is changed from the Branch student list.