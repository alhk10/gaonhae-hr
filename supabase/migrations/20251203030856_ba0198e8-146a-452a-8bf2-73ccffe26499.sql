-- Create education_resources table for lesson planning references
CREATE TABLE public.education_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  links JSONB DEFAULT '[]'::jsonb,
  file_urls JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE public.education_resources ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all resources
CREATE POLICY "Superadmins can manage education resources"
ON public.education_resources
FOR ALL
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

-- All authenticated employees can view active resources
CREATE POLICY "Employees can view active education resources"
ON public.education_resources
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_education_resources_updated_at
BEFORE UPDATE ON public.education_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for education files
INSERT INTO storage.buckets (id, name, public) VALUES ('education-files', 'education-files', true);

-- Storage policies for education files
CREATE POLICY "Anyone can view education files"
ON storage.objects FOR SELECT
USING (bucket_id = 'education-files');

CREATE POLICY "Superadmins can upload education files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'education-files' AND get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmins can delete education files"
ON storage.objects FOR DELETE
USING (bucket_id = 'education-files' AND get_current_user_role() = 'superadmin');