
-- Tighten has_sales_access: superadmin only (financial writes shouldn't piggy-back on dashboard view permission)
CREATE OR REPLACE FUNCTION public.has_sales_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.get_current_user_role() = 'superadmin';
$function$;

-- Make sensitive storage buckets private
UPDATE storage.buckets
SET public = false
WHERE id IN ('claim-receipts','student-photos','payment-proofs','receipts','notice-attachments');

-- Explicit deny-all-but-superadmin policy on cctv_camera_secrets if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cctv_camera_secrets') THEN
    EXECUTE 'ALTER TABLE public.cctv_camera_secrets ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Superadmins manage cctv camera secrets" ON public.cctv_camera_secrets';
    EXECUTE 'CREATE POLICY "Superadmins manage cctv camera secrets" ON public.cctv_camera_secrets FOR ALL TO authenticated USING (public.get_current_user_role() = ''superadmin'') WITH CHECK (public.get_current_user_role() = ''superadmin'')';
  END IF;
END $$;
