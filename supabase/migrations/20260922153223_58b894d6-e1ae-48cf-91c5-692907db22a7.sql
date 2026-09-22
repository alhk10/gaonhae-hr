
CREATE TABLE IF NOT EXISTS public.payment_amount_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  submission_id uuid,
  invoice_id uuid,
  old_subtotal numeric,
  old_tax numeric,
  old_total numeric,
  new_subtotal numeric,
  new_tax numeric,
  new_total numeric,
  evidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system'
);
GRANT SELECT ON public.payment_amount_corrections TO anon, authenticated;
GRANT ALL ON public.payment_amount_corrections TO service_role;
ALTER TABLE public.payment_amount_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view payment amount corrections"
  ON public.payment_amount_corrections FOR SELECT USING (true);
