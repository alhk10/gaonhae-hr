
-- Create claim_types table to replace localStorage
CREATE TABLE public.claim_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  limit_amount numeric,
  co_pay numeric NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on claim_types
ALTER TABLE public.claim_types ENABLE ROW LEVEL SECURITY;

-- Create policy for claim_types (read access for all authenticated users)
CREATE POLICY "Anyone can view active claim types" 
  ON public.claim_types 
  FOR SELECT 
  USING (is_active = true);

-- Create policy for superadmin to manage claim types
CREATE POLICY "Superadmin can manage claim types" 
  ON public.claim_types 
  FOR ALL 
  USING (true);

-- Insert default claim types
INSERT INTO public.claim_types (name, limit_amount, co_pay, description) VALUES
('Medical', 1000, 0, 'Medical expenses for full-time employees'),
('Transport', 500, 0, 'Transportation reimbursements'),
('Meal', 300, 20, 'Meal allowances with co-pay'),
('Equipment', NULL, 10, 'Equipment purchases with co-pay');

-- Create storage bucket for claim receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('claim-receipts', 'claim-receipts', true);

-- Create storage policies for claim receipts
CREATE POLICY "Anyone can view receipts" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'claim-receipts');

CREATE POLICY "Authenticated users can upload receipts" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'claim-receipts');

CREATE POLICY "Users can update their own receipts" 
  ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'claim-receipts');

CREATE POLICY "Users can delete their own receipts" 
  ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'claim-receipts');
