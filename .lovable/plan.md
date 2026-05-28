## Problem

`GP-202605-0014` is `status='verified'` (set when payment proof was verified) but `matched_invoice_id` is still NULL — no paid invoice has been created yet. Clicking **Import as Invoice** calls `admin_import_grading_submission`, which raises `Submission already verified` because it gates on `sub.status = 'verified'`. That guard mixes up two distinct states: "payment verified" vs "already imported to an invoice".

## Fix

Update the `admin_import_grading_submission` RPC so the duplicate-guard is based on `matched_invoice_id IS NOT NULL` instead of `status = 'verified'`. This lets a verified-but-unmatched submission be imported into a paid invoice once a student match is made, while still preventing double-import.

### Migration (single statement, replaces function body)

```sql
CREATE OR REPLACE FUNCTION public.admin_import_grading_submission(p_id uuid, p_verified_by text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE ... -- unchanged
BEGIN
  ...
  IF sub.matched_student_id IS NULL THEN RAISE EXCEPTION 'Submission must be matched to a student first'; END IF;
  IF sub.matched_invoice_id IS NOT NULL THEN RAISE EXCEPTION 'Submission already imported as invoice %', sub.matched_invoice_id; END IF;
  -- (remove the old `IF sub.status = 'verified'` check)
  ...
END;
$function$;
```

Everything else (invoice creation, payment row, grading registration, submission update to `status='verified'` + `matched_invoice_id`) stays the same.

## Verification

- Re-run import on `GP-202605-0014` → expect a new paid invoice + registration, no error.
- Attempt to import the same submission a second time → expect `Submission already imported as invoice …`.
- Existing verified+imported rows (0015–0019) remain protected by the new guard.
