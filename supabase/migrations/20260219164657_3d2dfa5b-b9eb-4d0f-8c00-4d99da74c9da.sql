
-- Create branch class type age settings table
CREATE TABLE public.branch_class_type_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id text NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  class_type text NOT NULL,
  min_age numeric NULL,
  max_age numeric NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(branch_id, class_type)
);

-- Enable RLS
ALTER TABLE public.branch_class_type_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read branch class type settings"
  ON public.branch_class_type_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage branch class type settings"
  ON public.branch_class_type_settings FOR ALL
  USING (public.check_employee_admin_access() OR public.get_current_user_role() = 'superadmin');

-- Trigger for updated_at
CREATE TRIGGER update_branch_class_type_settings_updated_at
  BEFORE UPDATE ON public.branch_class_type_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
