-- Add footer field to invoice_templates table
ALTER TABLE public.invoice_templates 
ADD COLUMN IF NOT EXISTS footer_text TEXT;