## Problem

Uploaded grading card files land at `payment-proofs/competition/<submissionId>/grading-card-*.jpg`, but no storage RLS policy allows reading from the `competition/` folder. `createSignedUrl` silently returns null, so `<SignedImage>` renders its empty fallback — the broken thumbnail seen in the dialog.

Existing SELECT policies on `payment-proofs` only cover `public-grading`, `public-comps`, `public-guards`, `public-seminars` folders (for anon and authenticated), plus admin/staff full access.

## Fix

Add two storage.objects SELECT policies mirroring the existing public-comps ones, but for the `competition/` folder used by the admin grading-card upload path:

- `Anon can read competition grading cards` — `anon`, `bucket_id='payment-proofs' AND (storage.foldername(name))[1]='competition'`
- `Staff can read competition grading cards` — `authenticated`, same predicate

This lets both the public grading-list page (password-gated, uses anon key) and staff resolve signed URLs for files already stored under `competition/…`, including Varina's backfilled row. No code or upload-path changes needed.

## Technical

Single migration adding the two policies via `CREATE POLICY … ON storage.objects FOR SELECT TO {anon,authenticated} USING (…)`. No table/schema changes.
