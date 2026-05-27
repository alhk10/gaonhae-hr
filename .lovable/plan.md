## Issues found

### 1. /comps payment submit fails — missing storage policies (root cause)

The public competition page (`/comps`) uploads proof + certificate files to the `payment-proofs` bucket under the `public-comps/` folder. But the bucket only has public-INSERT policies for `public-grading/` and `public-guards/` folders — there is no equivalent for `public-comps/`. Anonymous users get an RLS error from storage and the submit fails before the RPC even runs.

### 2. Dashboard "Invoices Created" widget throws a 42703 error

`src/components/dashboard/InvoicesCreatedSection.tsx` (line 30) selects `students(name)`, but the `students` table has no `name` column (only `first_name` / `last_name`). This is what's filling postgres logs with `column students_1.name does not exist`. Unrelated to /comps, but worth fixing in the same loop.

## Fixes

### A. Migration — storage policies for `public-comps/`

Add to `storage.objects`:

- `Public can upload comps proof` — INSERT, `WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'public-comps')`
- `Staff can read comps proof uploads` — SELECT, `USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'public-comps')` (authenticated)

Mirrors the existing `public-grading` / `public-guards` policies exactly.

### B. Frontend — `InvoicesCreatedSection.tsx`

- Change select to `students(first_name, last_name)`
- Change cell to `${inv.students?.first_name ?? ''} ${inv.students?.last_name ?? ''}`.trim() || 'Unknown'`

No other files affected. After the migration, re-test /comps submission end-to-end (proof upload + cert upload + submit).
