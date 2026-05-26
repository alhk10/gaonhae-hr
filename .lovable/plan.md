## Problem

`admin_import_grading_submission` references `sub.target_belt`, but `grading_payment_submissions` has no such column → "record sub has no field target_belt" on Verify & Import.

## Fix

Derive the target belt from the product name (convention: `"<Current> >> <Target>"`, e.g. `"Green Tip >> Green"`) inside the function, since the submissions table doesn't store it.

Migration: recreate `admin_import_grading_submission` with the registrations INSERT replacing `sub.target_belt` with:

```sql
COALESCE(
  NULLIF(TRIM(SPLIT_PART(v_product.name, '>>', 2)), ''),
  sub.current_belt
)
```

All other logic (invoice, item, payment, status update, branch access, dedupe) stays identical. No frontend changes.

After migration, re-run Verify & Import for Zainab / Caleb / Charlotte.