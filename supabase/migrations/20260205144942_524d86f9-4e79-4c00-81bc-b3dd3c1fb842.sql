-- Add company_name and footer_text fields to letter_templates
ALTER TABLE public.letter_templates 
ADD COLUMN IF NOT EXISTS company_name text DEFAULT '';

-- Note: footer_text already exists in the table based on types, just ensuring it's there
-- If it doesn't exist, this will add it
ALTER TABLE public.letter_templates 
ADD COLUMN IF NOT EXISTS footer_text text DEFAULT '';