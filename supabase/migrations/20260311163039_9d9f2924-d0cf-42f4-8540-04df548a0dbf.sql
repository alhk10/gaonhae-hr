
CREATE TABLE IF NOT EXISTS public.notice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL,
  product_id text,
  variant text,
  amount numeric,
  payment_method text NOT NULL,
  reference_number text,
  proof_url text,
  paid_by_email text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own payments" ON public.notice_payments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view their own payments" ON public.notice_payments
  FOR SELECT TO authenticated USING (
    paid_by_email = auth.email()
    OR public.get_current_user_role() = 'superadmin'
    OR public.has_branch_access()
  );
