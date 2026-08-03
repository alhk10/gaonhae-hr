CREATE TABLE public.ai_marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NULL,
  format text NOT NULL DEFAULT 'poster',
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  copy jsonb NULL,
  qr_choice text NULL,
  image_path text NULL,
  created_by_email text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_marketing_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_marketing_assets TO authenticated;
GRANT ALL ON public.ai_marketing_assets TO service_role;

ALTER TABLE public.ai_marketing_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ai marketing assets"
  ON public.ai_marketing_assets FOR SELECT
  USING (true);

CREATE POLICY "Public insert ai marketing assets"
  ON public.ai_marketing_assets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update ai marketing assets"
  ON public.ai_marketing_assets FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Public delete ai marketing assets"
  ON public.ai_marketing_assets FOR DELETE
  USING (true);

CREATE INDEX idx_ai_marketing_assets_created_at ON public.ai_marketing_assets (created_at DESC);

CREATE POLICY "Public read marketing assets folder"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'marketing-assets');

CREATE POLICY "Public write marketing assets folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'marketing-assets');

CREATE POLICY "Public delete marketing assets folder"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = 'marketing-assets');