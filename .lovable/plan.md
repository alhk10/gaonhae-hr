# Fix /seminars payment submission

## Root cause
The `/seminars` form uploads payment proof to `payment-proofs/public-seminars/...`, but the storage RLS policies only allow anon uploads to folders `public-comps`, `public-grading`, and `public-guards`. There's no policy for `public-seminars`, so anon uploads fail with "new row violates row-level security policy".

## Fix
Add two storage.objects policies for the `public-seminars` folder:
- Allow public (anonymous) users to upload payment proof images
- Allow authenticated staff to view uploaded seminar payment proofs

## Verification
After migration, test `/seminars` end-to-end (upload proof + submit). No code changes required — the service already targets the correct folder.