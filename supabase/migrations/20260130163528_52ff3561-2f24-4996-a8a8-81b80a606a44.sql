-- Create invoice_templates table for managing reusable invoice templates
CREATE TABLE public.invoice_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_payment_terms_days INTEGER DEFAULT 30,
  default_notes TEXT,
  default_internal_notes TEXT,
  template_items JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  branch_id TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "superadmin_manage_invoice_templates"
ON public.invoice_templates
FOR ALL
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "authenticated_view_invoice_templates"
ON public.invoice_templates
FOR SELECT
USING (is_active = true AND auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_invoice_templates_updated_at
BEFORE UPDATE ON public.invoice_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();