## Problem

Saving Yumi's scorecard fails with:
`new row for relation "grading_registrations" violates check constraint "grading_registrations_result_check"`

Yumi's scores (8.0 average) cause `computeAutoResult` to return `'double'`, but the database check constraint only allows `'pass' | 'fail' | 'conditional_pass'`. So every auto-save that lands in the `double` band is rejected — that's why her row (and any other high-scorer) can't be saved.

Current constraint:
```
CHECK (result = ANY (ARRAY['pass','fail','conditional_pass']))
```

App code (`src/constants/scorecardLabels.ts`) returns: `'pass' | 'double' | 'fail' | null` and the UI already renders a `double` badge.

## Fix

Single migration that drops and recreates the check constraint to include `'double'`:

```sql
ALTER TABLE public.grading_registrations
  DROP CONSTRAINT grading_registrations_result_check;

ALTER TABLE public.grading_registrations
  ADD CONSTRAINT grading_registrations_result_check
  CHECK (result IS NULL OR result = ANY (ARRAY['pass','fail','conditional_pass','double']));
```

No code changes needed — the frontend already handles `double`.

## Out of scope

- Changing scoring band thresholds
- Any other grading tab behaviour
