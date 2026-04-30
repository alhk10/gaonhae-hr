-- Social Media Manager — Phase 1 schema (sm_ prefix to avoid existing social_posts table)

CREATE TABLE IF NOT EXISTS public.sm_brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name text NOT NULL UNIQUE,
  tone_of_voice text,
  brand_keywords text[] DEFAULT '{}',
  banned_words text[] DEFAULT '{}',
  emoji_style text DEFAULT 'moderate',
  default_hashtags text[] DEFAULT '{}',
  cta_style text,
  target_audience text,
  preferred_caption_length text DEFAULT 'medium',
  color_palette jsonb DEFAULT '{}'::jsonb,
  logo_url text,
  posting_frequency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sm_prompt_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name text NOT NULL,
  name text NOT NULL,
  prompt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sm_ig_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name text NOT NULL,
  ig_user_id text NOT NULL,
  ig_username text,
  page_id text,
  page_name text,
  access_token text,
  token_expires_at timestamptz,
  status text NOT NULL DEFAULT 'connected',
  last_verified_at timestamptz,
  connected_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_name, ig_user_id)
);

CREATE TABLE IF NOT EXISTS public.sm_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  width int,
  height int,
  duration_seconds numeric,
  content_kind text NOT NULL,
  uploaded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sm_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name text NOT NULL,
  ig_account_id uuid REFERENCES public.sm_ig_accounts(id) ON DELETE SET NULL,
  content_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  caption text,
  hashtags text[] DEFAULT '{}',
  cta text,
  overlay_text text,
  reel_title text,
  event_name text,
  student_name text,
  instructor_name text,
  notes_for_ai text,
  tags text[] DEFAULT '{}',
  scheduled_for timestamptz,
  timezone text,
  published_at timestamptz,
  ig_media_id text,
  failure_reason text,
  created_by text,
  approved_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sm_post_assets (
  post_id uuid NOT NULL REFERENCES public.sm_posts(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.sm_media_assets(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, asset_id)
);

CREATE TABLE IF NOT EXISTS public.sm_ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.sm_posts(id) ON DELETE SET NULL,
  branch_name text,
  mode text,
  prompt jsonb,
  response jsonb,
  model text,
  tokens_used int,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sm_publish_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.sm_posts(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  ig_response jsonb,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_sm_posts_status ON public.sm_posts(status);
CREATE INDEX IF NOT EXISTS idx_sm_posts_branch ON public.sm_posts(branch_name);
CREATE INDEX IF NOT EXISTS idx_sm_posts_scheduled_for ON public.sm_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_sm_assets_branch ON public.sm_media_assets(branch_name);
CREATE INDEX IF NOT EXISTS idx_sm_ig_accounts_branch ON public.sm_ig_accounts(branch_name);
CREATE INDEX IF NOT EXISTS idx_sm_ai_generations_post ON public.sm_ai_generations(post_id);

DROP TRIGGER IF EXISTS trg_sm_brand_settings_updated_at ON public.sm_brand_settings;
CREATE TRIGGER trg_sm_brand_settings_updated_at BEFORE UPDATE ON public.sm_brand_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sm_prompt_presets_updated_at ON public.sm_prompt_presets;
CREATE TRIGGER trg_sm_prompt_presets_updated_at BEFORE UPDATE ON public.sm_prompt_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sm_ig_accounts_updated_at ON public.sm_ig_accounts;
CREATE TRIGGER trg_sm_ig_accounts_updated_at BEFORE UPDATE ON public.sm_ig_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sm_posts_updated_at ON public.sm_posts;
CREATE TRIGGER trg_sm_posts_updated_at BEFORE UPDATE ON public.sm_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sm_brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sm_prompt_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sm_ig_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sm_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sm_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sm_post_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sm_ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sm_publish_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin full access" ON public.sm_brand_settings;
CREATE POLICY "Superadmin full access" ON public.sm_brand_settings
  FOR ALL USING (public.is_superadmin(auth.email())) WITH CHECK (public.is_superadmin(auth.email()));

DROP POLICY IF EXISTS "Superadmin full access" ON public.sm_prompt_presets;
CREATE POLICY "Superadmin full access" ON public.sm_prompt_presets
  FOR ALL USING (public.is_superadmin(auth.email())) WITH CHECK (public.is_superadmin(auth.email()));

DROP POLICY IF EXISTS "Superadmin full access" ON public.sm_ig_accounts;
CREATE POLICY "Superadmin full access" ON public.sm_ig_accounts
  FOR ALL USING (public.is_superadmin(auth.email())) WITH CHECK (public.is_superadmin(auth.email()));

DROP POLICY IF EXISTS "Superadmin full access" ON public.sm_media_assets;
CREATE POLICY "Superadmin full access" ON public.sm_media_assets
  FOR ALL USING (public.is_superadmin(auth.email())) WITH CHECK (public.is_superadmin(auth.email()));

DROP POLICY IF EXISTS "Superadmin full access" ON public.sm_posts;
CREATE POLICY "Superadmin full access" ON public.sm_posts
  FOR ALL USING (public.is_superadmin(auth.email())) WITH CHECK (public.is_superadmin(auth.email()));

DROP POLICY IF EXISTS "Superadmin full access" ON public.sm_post_assets;
CREATE POLICY "Superadmin full access" ON public.sm_post_assets
  FOR ALL USING (public.is_superadmin(auth.email())) WITH CHECK (public.is_superadmin(auth.email()));

DROP POLICY IF EXISTS "Superadmin full access" ON public.sm_ai_generations;
CREATE POLICY "Superadmin full access" ON public.sm_ai_generations
  FOR ALL USING (public.is_superadmin(auth.email())) WITH CHECK (public.is_superadmin(auth.email()));

DROP POLICY IF EXISTS "Superadmin full access" ON public.sm_publish_logs;
CREATE POLICY "Superadmin full access" ON public.sm_publish_logs
  FOR ALL USING (public.is_superadmin(auth.email())) WITH CHECK (public.is_superadmin(auth.email()));

INSERT INTO public.sm_brand_settings (branch_name, tone_of_voice, target_audience, emoji_style, preferred_caption_length, posting_frequency)
VALUES
  ('Perth', 'Encouraging, family-friendly, professional martial arts coaching tone.', 'Parents of children aged 4-14 in Perth, plus adult students.', 'moderate', 'medium', '3-5 posts per week'),
  ('Singapore', 'Encouraging, family-friendly, disciplined martial arts coaching tone.', 'Parents of children aged 4-14 in Singapore, plus adult students.', 'moderate', 'medium', '3-5 posts per week')
ON CONFLICT (branch_name) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Superadmin read social-media" ON storage.objects;
CREATE POLICY "Superadmin read social-media" ON storage.objects FOR SELECT
  USING (bucket_id = 'social-media' AND public.is_superadmin(auth.email()));

DROP POLICY IF EXISTS "Superadmin write social-media" ON storage.objects;
CREATE POLICY "Superadmin write social-media" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'social-media' AND public.is_superadmin(auth.email()));

DROP POLICY IF EXISTS "Superadmin update social-media" ON storage.objects;
CREATE POLICY "Superadmin update social-media" ON storage.objects FOR UPDATE
  USING (bucket_id = 'social-media' AND public.is_superadmin(auth.email()));

DROP POLICY IF EXISTS "Superadmin delete social-media" ON storage.objects;
CREATE POLICY "Superadmin delete social-media" ON storage.objects FOR DELETE
  USING (bucket_id = 'social-media' AND public.is_superadmin(auth.email()));
