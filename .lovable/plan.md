# Fix `/guards` submission RLS error

## Root cause

`submitGuardsPurchase` in `src/services/guardsPurchaseService.ts` calls:

```ts
supabase.from('guards_purchases').insert(row).select('id, reference_number').single()
```

`guards_purchases` has only one SELECT policy (superadmin-only). When an anonymous public user inserts and asks PostgREST to return the row, PostgREST evaluates the SELECT policy against the new row, fails, and surfaces it as:

> new row violates row-level security policy for table "guards_purchases"

(The same pattern is why `/seminars` and `/comps` use a `SECURITY DEFINER` RPC instead of a direct insert.)

## Fix

Mirror the seminar/competition pattern with a `SECURITY DEFINER` RPC.

### 1. Migration — create `submit_guards_purchase`

- Function `public.submit_guards_purchase(_row jsonb) returns table(id uuid, reference_number text)`
- `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`
- Inserts the validated whitelisted fields from `_row` into `guards_purchases` with `sale_status = 'pending_verification'`, then returns the new `id` and `reference_number`.
- Whitelisted fields: `first_name, last_name, date_of_birth, branch_id, gender, current_belt, email, phone, items, subtotal, gst_amount, total, payment_method, proof_url, variant_selections`.
- `GRANT EXECUTE ON FUNCTION public.submit_guards_purchase(jsonb) TO anon, authenticated;`
- Leave existing RLS policies untouched.

### 2. Code — `src/services/guardsPurchaseService.ts`

In `submitGuardsPurchase`, replace the direct `.insert(...).select(...).single()` block with:

```ts
const { data, error } = await supabase.rpc('submit_guards_purchase' as any, { _row: row as any });
if (error) throw error;
const inserted = Array.isArray(data) ? data[0] : data;
if (!inserted) throw new Error('Submission failed: no record returned');
```

Keep the rest of the function (storage upload, totals, email invoke) unchanged.

### 3. Verification

- Re-submit the `/guards` form from an incognito session and confirm: row inserted, reference returned, confirmation email queued, no RLS error.
- Confirm superadmin can still read/update/delete via existing policies.
- Confirm `/comps`, `/seminars`, `/grading-payment` still work (unchanged).

## Out of scope

- No change to RLS policies on `guards_purchases`.
- No change to admin pages, variant selection, or invoice creation flow.
- No change to storage bucket policies (upload already works).
