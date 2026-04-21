-- 1. Add social_media column
ALTER TABLE public.employee_page_access
  ADD COLUMN IF NOT EXISTS social_media boolean DEFAULT false;

-- Drop and recreate get_page_access_for_auth to include social_media
DROP FUNCTION IF EXISTS public.get_page_access_for_auth(text);

CREATE FUNCTION public.get_page_access_for_auth(p_employee_id text)
 RETURNS TABLE(profile boolean, apply_leave boolean, submit_claim boolean, payslips boolean, my_attendance boolean, slot_booking_employee boolean, cctv_monitoring boolean, social_media boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT profile, apply_leave, submit_claim, payslips, my_attendance, slot_booking_employee, cctv_monitoring, social_media
  FROM public.employee_page_access
  WHERE employee_id = p_employee_id
  LIMIT 1;
$function$;

-- 2. brand_settings table
CREATE TABLE public.brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id text REFERENCES public.branches(id) ON DELETE CASCADE,
  tone text DEFAULT '',
  keywords text[] DEFAULT '{}',
  default_hashtags text[] DEFAULT '{}',
  caption_style text DEFAULT '',
  language text DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(branch_id)
);

ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand settings viewable by branch access"
ON public.brand_settings
FOR SELECT
TO authenticated
USING (
  get_current_user_role() = 'superadmin'
  OR branch_id IS NULL
  OR has_branch_access(branch_id)
);

CREATE POLICY "Brand settings managed by superadmin"
ON public.brand_settings
FOR ALL
TO authenticated
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE TRIGGER trg_brand_settings_updated_at
BEFORE UPDATE ON public.brand_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. social_posts table
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id text NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('achievement','training','educational','promotion')),
  caption text DEFAULT '',
  cta text DEFAULT '',
  hashtags text[] DEFAULT '{}',
  media_url text,
  media_type text CHECK (media_type IN ('image','video')),
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','scheduled','publishing','published','failed')),
  instagram_media_id text,
  instagram_permalink text,
  failure_reason text,
  rejection_note text,
  created_by text,
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_posts_branch ON public.social_posts(branch_id);
CREATE INDEX idx_social_posts_status ON public.social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON public.social_posts(scheduled_at) WHERE status = 'scheduled';

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Social posts viewable by branch access"
ON public.social_posts
FOR SELECT
TO authenticated
USING (
  get_current_user_role() = 'superadmin'
  OR has_branch_access(branch_id)
);

CREATE POLICY "Social posts insertable by branch access"
ON public.social_posts
FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_role() = 'superadmin'
  OR has_branch_access(branch_id)
);

CREATE POLICY "Social posts updatable by creator or superadmin"
ON public.social_posts
FOR UPDATE
TO authenticated
USING (
  get_current_user_role() = 'superadmin'
  OR (created_by = auth.email() AND status = 'draft')
)
WITH CHECK (
  get_current_user_role() = 'superadmin'
  OR (created_by = auth.email() AND status IN ('draft','pending_approval'))
);

CREATE POLICY "Social posts deletable by superadmin"
ON public.social_posts
FOR DELETE
TO authenticated
USING (get_current_user_role() = 'superadmin');

CREATE TRIGGER trg_social_posts_updated_at
BEFORE UPDATE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Social media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-media');

CREATE POLICY "Social media authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'social-media');

CREATE POLICY "Social media authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'social-media');

CREATE POLICY "Social media authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'social-media');

-- 5. Cron extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;