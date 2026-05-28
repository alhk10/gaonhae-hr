## Fix payment proof viewing on public `/grading-list` (incognito / anon)

### Root cause

`payment-proofs` is a private bucket. The only storage SELECT policies are for `authenticated` ("Staff can read … proof uploads"). When the public `/grading-list` page is opened in incognito (anon role):

1. The submission service stored `proof_url` as a bare path (e.g. `public-grading/<branch>/<file>.jpg`) because the original `createSignedUrl` call at upload time also failed for anon and fell back to the path.
2. `resolveStorageUrl` then calls `supabase.storage.from('payment-proofs').createSignedUrl(path, ...)` from an anon session — anon has no SELECT policy → returns `null` → `<SignedImage>` and the lightbox `<img>` both render broken/empty.

### Fix — add anon SELECT policies on `storage.objects` for the four public-submission prefixes

The `/grading-list`, `/comps`, `/seminars`, and `/guards` flows already publicly display these submissions (student name, amount, etc.), so allowing anon to read the proof images in those prefixes matches the existing exposure.

Add a migration with four policies, scoped tightly to bucket + top-level folder:

```sql
CREATE POLICY "Anon can read grading proof uploads"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'public-grading');

CREATE POLICY "Anon can read comps proof uploads"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'public-comps');

CREATE POLICY "Anon can read seminar proof uploads"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'public-seminars');

CREATE POLICY "Anon can read guards proof uploads"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'public-guards');
```

With these in place, `resolveStorageUrl` will successfully mint a 1-hour signed URL for the anon session and the proof image will render in both the inline thumbnail and the lightbox.

### Out of scope

- No client code changes needed.
- Authenticated/staff policies untouched.
- Other private buckets (`claim-receipts`, `student-photos`, `receipts`, `notice-attachments`) remain auth-only.
