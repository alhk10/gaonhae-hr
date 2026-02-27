
CREATE TABLE public.inventory_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_branch_id TEXT NOT NULL,
  to_branch_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  size_variant TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins full access on transfer requests"
ON public.inventory_transfer_requests
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'superadmin')
WITH CHECK (public.get_current_user_role() = 'superadmin');

CREATE POLICY "Branch employees can view their transfer requests"
ON public.inventory_transfer_requests
FOR SELECT
TO authenticated
USING (
  public.has_branch_access(from_branch_id) OR public.has_branch_access(to_branch_id)
);

CREATE POLICY "Branch employees can create transfer requests"
ON public.inventory_transfer_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_branch_access(from_branch_id) OR public.has_branch_access(to_branch_id)
);

CREATE TRIGGER update_inventory_transfer_requests_updated_at
  BEFORE UPDATE ON public.inventory_transfer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
