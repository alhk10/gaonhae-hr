## Status

The `grading_registrations_result_check` constraint has already been updated in the database to accept `'double'`. Emily's scores (avg 8.0 → `'double'`) will save once the browser has the latest DB state.

**Action for you:** hard-refresh the tab (Ctrl+Shift+R). The error toast in the screenshot was almost certainly from a request fired before the migration finished.

## Additional preventive fix

While auditing I found a sibling constraint that will bite the same way if we ever start writing grading history rows: `student_grading_history_result_check` still only allows `pass | fail | conditional_pass`. Nothing writes to it automatically today, but manual writes / future features would break.

Migration:

```sql
ALTER TABLE public.student_grading_history
  DROP CONSTRAINT student_grading_history_result_check;

ALTER TABLE public.student_grading_history
  ADD CONSTRAINT student_grading_history_result_check
  CHECK (result IS NULL OR result = ANY (ARRAY['pass','fail','conditional_pass','double']));
```

No code changes.

## Out of scope

- Any UI changes
- Scoring band thresholds
