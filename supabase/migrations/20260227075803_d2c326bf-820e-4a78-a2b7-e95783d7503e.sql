
-- Create notices table
CREATE TABLE public.notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  created_by_email TEXT NOT NULL,
  created_by_branch_id TEXT,
  target_branches TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmins see all; employees see relevant notices
CREATE POLICY "notices_select" ON public.notices FOR SELECT USING (
  get_current_user_role() = 'superadmin'
  OR target_branches IS NULL
  OR EXISTS (
    SELECT 1 FROM public.employee_branch_access eba
    JOIN public.employees e ON eba.employee_id = e.id
    WHERE e.email = auth.email()
    AND eba.branch_id = ANY(target_branches)
  )
  OR created_by_branch_id IN (
    SELECT eba.branch_id FROM public.employee_branch_access eba
    JOIN public.employees e ON eba.employee_id = e.id
    WHERE e.email = auth.email()
  )
);

-- INSERT: superadmins and employees with branch dashboard access
CREATE POLICY "notices_insert" ON public.notices FOR INSERT WITH CHECK (
  get_current_user_role() = 'superadmin' OR has_branch_access()
);

-- UPDATE: superadmins or creator
CREATE POLICY "notices_update" ON public.notices FOR UPDATE USING (
  get_current_user_role() = 'superadmin' OR created_by_email = auth.email()
) WITH CHECK (
  get_current_user_role() = 'superadmin' OR created_by_email = auth.email()
);

-- DELETE: superadmins or creator
CREATE POLICY "notices_delete" ON public.notices FOR DELETE USING (
  get_current_user_role() = 'superadmin' OR created_by_email = auth.email()
);

-- Updated_at trigger
CREATE TRIGGER update_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for notice attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('notice-attachments', 'notice-attachments', true);

-- Storage policies
CREATE POLICY "notice_attachments_select" ON storage.objects FOR SELECT USING (bucket_id = 'notice-attachments');
CREATE POLICY "notice_attachments_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'notice-attachments' AND (
    (SELECT get_current_user_role()) = 'superadmin' OR (SELECT has_branch_access())
  )
);
CREATE POLICY "notice_attachments_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'notice-attachments' AND (
    (SELECT get_current_user_role()) = 'superadmin' OR (SELECT has_branch_access())
  )
);
CREATE POLICY "notice_attachments_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'notice-attachments' AND (
    (SELECT get_current_user_role()) = 'superadmin' OR (SELECT has_branch_access())
  )
);
