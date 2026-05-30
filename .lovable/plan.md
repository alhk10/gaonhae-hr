# Fix: Albert cannot submit claims

## Root cause

The `public.claims` and `public.claim_types` tables have **no GRANTs** for any Data API role (`anon`, `authenticated`, `service_role`). RLS policies are correctly defined (including an `INSERT` policy for `authenticated` that requires `employee_id = get_current_employee_id()` and `status = 'Pending'`), but PostgREST blocks every request at the privilege layer before RLS is even evaluated, so the insert silently fails with a permission error for every employee — Albert included.

Verified:
- Albert exists as `EMP1750865290864` / `albertcorpuz873@gmail.com` (Full-Time, SENIOR INSTRUCTOR).
- `claims` policies look correct.
- `information_schema.role_table_grants` returns zero rows for both `claims` and `claim_types`.

## Fix

Single migration adding the missing Data API grants. No RLS, schema, or app code changes.

```sql
-- claims: writeable by authenticated employees, read filtered by RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;

-- claim_types: reference data, readable by all signed-in users; admins manage via RLS
GRANT SELECT ON public.claim_types TO authenticated;
GRANT ALL ON public.claim_types TO service_role;
```

No `anon` grant — both tables require an authenticated employee context.

## Verification

After the migration:
1. Log in as Albert in an incognito window.
2. Submit a test claim with a receipt.
3. Confirm the claim appears in his history with status Pending.
4. Confirm superadmin still sees and can approve/reject it.
