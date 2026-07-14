## Fix

Miguel Juan Rodriguez (Morley, DOB 2022-11-22, age 3) currently has `current_belt = 'Foundation'` — the legacy AU value. The active AU list is `Foundation 1 / 2 / 3`, so grading products named `Foundation 1 >> Foundation 2` etc. are filtered out (name-match rule compares normalized 'From' to the student's belt).

### Data change

Run one UPDATE via the insert tool:

```sql
UPDATE public.students
SET current_belt = 'Foundation 1'
WHERE id = '5613adb0-9ef1-4193-8bd5-bf8d44ac358f';
```

No code changes. No migration.

### Expected result

After the update, the Grading dropdown for Miguel at Morley will include `Foundation 1 >> Foundation 2` (plus the stage/provisional items already showing) — provided that product is in Morley's branch price-rule pool. If it isn't, we'll add it to Morley's pool as a follow-up.

### Not in scope

- Backfilling other students still on legacy `Foundation`. If you want a global sweep (AU students only), say so and I'll add a second UPDATE.
- Any change to the belt-matching rules themselves.
