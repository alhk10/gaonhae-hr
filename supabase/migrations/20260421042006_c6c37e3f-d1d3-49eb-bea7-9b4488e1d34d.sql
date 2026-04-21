-- 1. cctv_cameras table
CREATE TABLE public.cctv_cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id text NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  mediamtx_path text NOT NULL,
  supports_playback boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mediamtx_path)
);

CREATE INDEX idx_cctv_cameras_branch_id ON public.cctv_cameras(branch_id);

ALTER TABLE public.cctv_cameras ENABLE ROW LEVEL SECURITY;

-- View: superadmin or branch access
CREATE POLICY "View cameras with branch access"
ON public.cctv_cameras
FOR SELECT
TO authenticated
USING (public.has_branch_access(branch_id));

-- Insert/update/delete: superadmin only
CREATE POLICY "Superadmin manage cameras insert"
ON public.cctv_cameras
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmin manage cameras update"
ON public.cctv_cameras
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() = 'superadmin')
WITH CHECK (public.get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmin manage cameras delete"
ON public.cctv_cameras
FOR DELETE
TO authenticated
USING (public.get_current_user_role() = 'superadmin');

CREATE TRIGGER update_cctv_cameras_updated_at
BEFORE UPDATE ON public.cctv_cameras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. cctv_camera_secrets table (server-only)
CREATE TABLE public.cctv_camera_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id uuid NOT NULL UNIQUE REFERENCES public.cctv_cameras(id) ON DELETE CASCADE,
  rtsp_url text NOT NULL,
  username text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cctv_camera_secrets ENABLE ROW LEVEL SECURITY;

-- Deny all to authenticated; only service_role bypasses RLS
-- (No policies = no access for authenticated users; service_role still bypasses RLS)

CREATE TRIGGER update_cctv_camera_secrets_updated_at
BEFORE UPDATE ON public.cctv_camera_secrets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add cctv_monitoring permission to employee_page_access
ALTER TABLE public.employee_page_access
ADD COLUMN IF NOT EXISTS cctv_monitoring boolean DEFAULT false;