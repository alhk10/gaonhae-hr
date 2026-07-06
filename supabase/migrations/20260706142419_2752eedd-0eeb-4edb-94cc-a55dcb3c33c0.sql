
CREATE TABLE public.sms_device_branches (
  device_id uuid NOT NULL REFERENCES public.sms_devices(id) ON DELETE CASCADE,
  branch_id text NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, branch_id)
);

GRANT SELECT ON public.sms_device_branches TO authenticated;
GRANT ALL ON public.sms_device_branches TO service_role;

ALTER TABLE public.sms_device_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view device branch tags"
  ON public.sms_device_branches FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Superadmins manage device branch tags"
  ON public.sms_device_branches FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.superadmin_users s WHERE s.employee_email = auth.email() AND s.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.superadmin_users s WHERE s.employee_email = auth.email() AND s.is_active = true));

CREATE INDEX idx_sms_device_branches_branch ON public.sms_device_branches(branch_id);

ALTER TABLE public.sms_outbound ADD COLUMN IF NOT EXISTS branch_id text REFERENCES public.branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sms_outbound_branch_status ON public.sms_outbound(status, branch_id);
