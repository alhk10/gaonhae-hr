
## Plan: Fix "Failed to save class" — migrate legacy belt names

### Root cause
Existing rows in `branch_timetables.belt_levels` (and `grading_slots.belt_levels`) contain legacy belt names: `Dan 1…Dan 5` and `Poom 1…Poom 4`. The DB CHECK constraint `is_valid_belt_level_array` only accepts the modern names (`1st Dan…5th Dan`, `1st Poom…4th Poom`).

When a superadmin opens an existing class to edit and submits, the UPDATE re-writes `belt_levels` — and the legacy values fail the constraint, so Supabase rejects the row → frontend shows toast "Failed to save class".

The dialog also displays the stale names in the "Selected:" hint while the checkbox list shows modern names, so the user has no way to clean them up by hand.

### Verification done
- Queried `pg_constraint` → confirmed CHECK uses `is_valid_belt_level_array`.
- Queried distinct belt values → 9 legacy variants present in `branch_timetables` (every weekday × Teens & Adults rows, plus Foundation 1/2/3 mixed in) and a handful in `grading_slots`.
- `students.current_belt`, `student_registrations`, `grading_registrations`, `student_grading_history`, `products.*`, `notices.target_belt_levels`, `price_rules.*` — all clean (no legacy values).

### Fix (single SQL migration)

Run a one-shot data migration that rewrites the legacy names in the two affected tables:

```sql
-- Map: 'Dan N' -> 'Nth Dan', 'Poom N' -> 'Nth Poom'
UPDATE public.branch_timetables
SET belt_levels = (
  SELECT ARRAY_AGG(
    CASE b
      WHEN 'Dan 1' THEN '1st Dan' WHEN 'Dan 2' THEN '2nd Dan'
      WHEN 'Dan 3' THEN '3rd Dan' WHEN 'Dan 4' THEN '4th Dan'
      WHEN 'Dan 5' THEN '5th Dan'
      WHEN 'Poom 1' THEN '1st Poom' WHEN 'Poom 2' THEN '2nd Poom'
      WHEN 'Poom 3' THEN '3rd Poom' WHEN 'Poom 4' THEN '4th Poom'
      ELSE b
    END
  )
  FROM unnest(belt_levels) AS b
)
WHERE belt_levels && ARRAY['Dan 1','Dan 2','Dan 3','Dan 4','Dan 5','Poom 1','Poom 2','Poom 3','Poom 4'];

-- Same fix for grading_slots
UPDATE public.grading_slots
SET belt_levels = (
  SELECT ARRAY_AGG(
    CASE b
      WHEN 'Dan 1' THEN '1st Dan' WHEN 'Dan 2' THEN '2nd Dan'
      WHEN 'Dan 3' THEN '3rd Dan' WHEN 'Dan 4' THEN '4th Dan'
      WHEN 'Dan 5' THEN '5th Dan'
      WHEN 'Poom 1' THEN '1st Poom' WHEN 'Poom 2' THEN '2nd Poom'
      WHEN 'Poom 3' THEN '3rd Poom' WHEN 'Poom 4' THEN '4th Poom'
      ELSE b
    END
  )
  FROM unnest(belt_levels) AS b
)
WHERE belt_levels && ARRAY['Dan 1','Dan 2','Dan 3','Dan 4','Dan 5','Poom 1','Poom 2','Poom 3','Poom 4'];
```

### Frontend
No code change needed — the dialog already reads `BELT_LEVELS` (modern names). After the migration, existing rows will load with the correct checkboxes pre-ticked and saving will pass the CHECK constraint.

Optional hardening: surface the actual Supabase error message in the toast (`toast.error(\`Failed to save class: \${error.message}\`)`) so future constraint violations are easier to diagnose. This is a one-line tweak in `BranchClassScheduleManagement.tsx` — included.

### Verification after apply
- Re-run distinct-belt query → no `Dan N` / `Poom N` values remain.
- Open the failing Tuesday Teens & Adults class → save without changes → succeeds.
- Toggling belts on/off persists correctly.

### Out of scope
- Renaming any other tables (none affected).
- Changing the constraint itself (current modern naming stays canonical).
