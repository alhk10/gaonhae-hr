DROP POLICY IF EXISTS "Public can upload comps proof" ON storage.objects;
DROP POLICY IF EXISTS "Staff can read comps proof uploads" ON storage.objects;

CREATE POLICY "Public can upload comps proof"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'public-comps');

CREATE POLICY "Staff can read comps proof uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'public-comps');