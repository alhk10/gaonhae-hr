
-- Drop OAuth/IG tables (and dependent objects)
DROP TABLE IF EXISTS public.sm_ig_accounts CASCADE;
DROP TABLE IF EXISTS public.sm_oauth_states CASCADE;

-- Extend sm_posts for multi-platform manual workflow
ALTER TABLE public.sm_posts
  ADD COLUMN IF NOT EXISTS target_platforms text[] NOT NULL DEFAULT ARRAY['instagram']::text[],
  ADD COLUMN IF NOT EXISTS platform_captions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS posted_platforms jsonb NOT NULL DEFAULT '{}'::jsonb;

-- scheduled_for already exists per existing type; ensure column exists for safety
ALTER TABLE public.sm_posts
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- New manual metrics table
CREATE TABLE IF NOT EXISTS public.sm_post_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.sm_posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  views integer DEFAULT 0,
  shares integer DEFAULT 0,
  saves integer DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, platform)
);

ALTER TABLE public.sm_post_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage sm_post_metrics"
  ON public.sm_post_metrics
  FOR ALL
  USING (public.is_superadmin(auth.email()))
  WITH CHECK (public.is_superadmin(auth.email()));

CREATE TRIGGER sm_post_metrics_updated_at
  BEFORE UPDATE ON public.sm_post_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sm_post_metrics_post ON public.sm_post_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_sm_posts_scheduled_for ON public.sm_posts(scheduled_for) WHERE scheduled_for IS NOT NULL;
