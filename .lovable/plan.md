## Fix: "null value in target_belt" on Verify & Import

**Cause:** `admin_import_grading_submission` inserts into `grading_registrations` without a `target_belt`, but that column is NOT NULL.

**Fix:** Update the RPC so the registration insert includes `target_belt`, using `COALESCE(sub.target_belt, sub.current_belt)` as a safety fallback. `current_belt` is also added explicitly already; we just add the missing `target_belt` column.

### Migration

Replace `public.admin_import_grading_submission` — identical body, but the `INSERT INTO public.grading_registrations` block becomes:

```sql
INSERT INTO public.grading_registrations (
  grading_slot_id, student_id, invoice_item_id,
  current_belt, target_belt, created_by
)
SELECT sub.resolved_grading_slot_id, sub.matched_student_id, v_invoice_item_id,
       sub.current_belt,
       COALESCE(sub.target_belt, sub.current_belt),
       p_verified_by
WHERE NOT EXISTS (
  SELECT 1 FROM public.grading_registrations
  WHERE grading_slot_id = sub.resolved_grading_slot_id
    AND student_id = sub.matched_student_id
);
```

No frontend or schema changes needed. Existing matched submissions (Zainab, Caleb, Charlotte) can be re-imported after the migration runs.