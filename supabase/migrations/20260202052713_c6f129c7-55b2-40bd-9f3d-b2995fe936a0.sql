-- Add logo_url and letterhead_url columns to invoice_templates
ALTER TABLE public.invoice_templates 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS letterhead_url TEXT;