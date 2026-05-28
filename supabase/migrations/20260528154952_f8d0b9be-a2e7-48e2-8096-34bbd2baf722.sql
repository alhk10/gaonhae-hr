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