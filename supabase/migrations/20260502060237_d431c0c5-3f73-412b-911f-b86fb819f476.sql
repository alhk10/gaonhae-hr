
-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL,
  document_level TEXT,
  custom_label TEXT,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_mime TEXT,
  file_size_bytes BIGINT,
  linked_type TEXT,
  linked_id TEXT,
  branch_id TEXT,
  match_status TEXT NOT NULL DEFAULT 'pending',
  match_confidence NUMERIC,
  extracted_data JSONB,
  ai_suggestion JSONB,
  notes TEXT,
  uploaded_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT documents_type_check CHECK (document_type IN (
    'kukkiwon_poom','kukkiwon_dan','stf_poom','stf_dan',
    'nric_fin','ep_sp_wp','passport',
    'stf_poomsae_referee','stf_poomsae_coach',
    'stf_kyorugi_referee','sg_coach','stf_coach_induction','others'
  )),
  CONSTRAINT documents_linked_type_check CHECK (linked_type IS NULL OR linked_type IN ('student','employee')),
  CONSTRAINT documents_match_status_check CHECK (match_status IN ('pending','matched','unmatched','rejected'))
);

CREATE INDEX idx_documents_linked ON public.documents(linked_type, linked_id);
CREATE INDEX idx_documents_branch ON public.documents(branch_id);
CREATE INDEX idx_documents_type ON public.documents(document_type);
CREATE INDEX idx_documents_match_status ON public.documents(match_status);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS: Superadmin full access
CREATE POLICY "Superadmin full access to documents"
ON public.documents FOR ALL
USING (public.get_current_user_role() = 'superadmin')
WITH CHECK (public.get_current_user_role() = 'superadmin');

-- RLS: Branch staff access by branch
CREATE POLICY "Branch staff can view documents in their branch"
ON public.documents FOR SELECT
USING (
  branch_id IS NULL
  OR public.has_branch_access(branch_id)
);

CREATE POLICY "Branch staff can insert documents in their branch"
ON public.documents FOR INSERT
WITH CHECK (
  branch_id IS NULL
  OR public.has_branch_access(branch_id)
);

CREATE POLICY "Branch staff can update documents in their branch"
ON public.documents FOR UPDATE
USING (
  branch_id IS NULL
  OR public.has_branch_access(branch_id)
)
WITH CHECK (
  branch_id IS NULL
  OR public.has_branch_access(branch_id)
);

CREATE POLICY "Branch staff can delete documents in their branch"
ON public.documents FOR DELETE
USING (
  branch_id IS NULL
  OR public.has_branch_access(branch_id)
);

-- updated_at trigger
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Private storage bucket for document files
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: superadmin full, branch staff via authenticated role
CREATE POLICY "Authenticated users can read documents bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload to documents bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update in documents bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete from documents bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
