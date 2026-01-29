-- Create employee_invoice_access table
CREATE TABLE public.employee_invoice_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  can_create BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  UNIQUE(employee_id, branch_id)
);

-- Enable RLS
ALTER TABLE public.employee_invoice_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Superadmins can manage invoice access"
ON public.employee_invoice_access FOR ALL
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "Employees view own invoice access"
ON public.employee_invoice_access FOR SELECT
USING (employee_id = get_current_employee_id());

-- Index for performance
CREATE INDEX idx_employee_invoice_access_employee 
ON public.employee_invoice_access(employee_id);

CREATE INDEX idx_employee_invoice_access_branch 
ON public.employee_invoice_access(branch_id);