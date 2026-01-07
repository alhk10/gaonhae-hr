-- Create table to store partner branch shares
CREATE TABLE public.partner_branch_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  share_percentage NUMERIC(5,2) NOT NULL CHECK (share_percentage > 0 AND share_percentage <= 100),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE DEFAULT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(employee_id, branch_id, effective_from)
);

-- Enable RLS
ALTER TABLE public.partner_branch_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Superadmins can manage all partner shares"
ON public.partner_branch_shares
FOR ALL
USING (public.get_current_user_role() = 'superadmin');

CREATE POLICY "Admins with employees access can view partner shares"
ON public.partner_branch_shares
FOR SELECT
USING (public.has_admin_access('employees'));

CREATE POLICY "Partners can view their own shares"
ON public.partner_branch_shares
FOR SELECT
USING (employee_id = public.get_current_employee_id());

-- Create trigger for updated_at
CREATE TRIGGER update_partner_branch_shares_updated_at
BEFORE UPDATE ON public.partner_branch_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_partner_branch_shares_employee ON public.partner_branch_shares(employee_id);
CREATE INDEX idx_partner_branch_shares_branch ON public.partner_branch_shares(branch_id);
CREATE INDEX idx_partner_branch_shares_effective ON public.partner_branch_shares(effective_from, effective_to);