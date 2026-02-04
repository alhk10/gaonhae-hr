-- Add bank transfer information field to invoice templates
ALTER TABLE invoice_templates 
ADD COLUMN bank_transfer_info TEXT;