
CREATE TABLE IF NOT EXISTS public.guards_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  branch_id text REFERENCES public.branches(id),
  gender text,
  current_belt text,
  email text,
  phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  gst_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text,
  proof_url text,
  sale_status text NOT NULL DEFAULT 'pending_verification',
  collected boolean NOT NULL DEFAULT false,
  collected_at timestamptz,
  collected_by text,
  matched_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guards_purchases_created_at ON public.guards_purchases (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guards_purchases_branch ON public.guards_purchases (branch_id);
CREATE INDEX IF NOT EXISTS idx_guards_purchases_status ON public.guards_purchases (sale_status);

CREATE OR REPLACE FUNCTION public.set_guards_purchase_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := 'GP' || to_char(now(), 'YYMMDD') || lpad((floor(random()*10000))::int::text, 4, '0');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guards_purchases_ref ON public.guards_purchases;
CREATE TRIGGER trg_guards_purchases_ref
BEFORE INSERT OR UPDATE ON public.guards_purchases
FOR EACH ROW EXECUTE FUNCTION public.set_guards_purchase_reference();

ALTER TABLE public.guards_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit guards purchase" ON public.guards_purchases;
CREATE POLICY "Public can submit guards purchase"
ON public.guards_purchases
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Superadmin can read guards purchases" ON public.guards_purchases;
CREATE POLICY "Superadmin can read guards purchases"
ON public.guards_purchases
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'superadmin');

DROP POLICY IF EXISTS "Superadmin can update guards purchases" ON public.guards_purchases;
CREATE POLICY "Superadmin can update guards purchases"
ON public.guards_purchases
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() = 'superadmin')
WITH CHECK (public.get_current_user_role() = 'superadmin');

DROP POLICY IF EXISTS "Superadmin can delete guards purchases" ON public.guards_purchases;
CREATE POLICY "Superadmin can delete guards purchases"
ON public.guards_purchases
FOR DELETE
TO authenticated
USING (public.get_current_user_role() = 'superadmin');

DROP POLICY IF EXISTS "Public can upload guards proof" ON storage.objects;
CREATE POLICY "Public can upload guards proof"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = 'public-guards'
);

DROP POLICY IF EXISTS "Staff can read guards proof uploads" ON storage.objects;
CREATE POLICY "Staff can read guards proof uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = 'public-guards'
);
