CREATE TABLE public.sm_caricatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  branch_name text,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sm_caricatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access on sm_caricatures"
  ON public.sm_caricatures FOR ALL
  USING (public.is_superadmin(auth.email()))
  WITH CHECK (public.is_superadmin(auth.email()));

CREATE TRIGGER trg_sm_caricatures_updated
  BEFORE UPDATE ON public.sm_caricatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('social-caricatures', 'social-caricatures', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Superadmin manage caricature files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'social-caricatures' AND public.is_superadmin(auth.email()))
  WITH CHECK (bucket_id = 'social-caricatures' AND public.is_superadmin(auth.email()));

CREATE POLICY "Public read caricature files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'social-caricatures');