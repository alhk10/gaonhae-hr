-- Add new columns to invoice_templates
ALTER TABLE public.invoice_templates 
ADD COLUMN IF NOT EXISTS paynow_qr_url TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'SG';

-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-qr-codes', 'invoice-qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for invoice-qr-codes bucket
-- Allow public read access
CREATE POLICY "QR codes are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'invoice-qr-codes');

-- Allow superadmins to upload QR codes
CREATE POLICY "Superadmins can upload QR codes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'invoice-qr-codes' 
  AND public.get_current_user_role() = 'superadmin'
);

-- Allow superadmins to update QR codes
CREATE POLICY "Superadmins can update QR codes"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'invoice-qr-codes' 
  AND public.get_current_user_role() = 'superadmin'
);

-- Allow superadmins to delete QR codes
CREATE POLICY "Superadmins can delete QR codes"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'invoice-qr-codes' 
  AND public.get_current_user_role() = 'superadmin'
);