CREATE POLICY "Anon can read competition grading cards"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'competition');

CREATE POLICY "Staff can read competition grading cards"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'competition');