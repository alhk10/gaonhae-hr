CREATE POLICY "Public can upload seminar proof"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = 'public-seminars'
);

CREATE POLICY "Staff can read seminar proof uploads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = 'public-seminars'
);