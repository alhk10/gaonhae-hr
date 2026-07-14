DROP POLICY IF EXISTS "Admins upload payment proofs" ON storage.objects;

CREATE POLICY "Anyone can upload payment proofs"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');