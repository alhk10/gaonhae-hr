-- Add new columns to letter_templates table for enhanced template functionality
ALTER TABLE public.letter_templates 
  ADD COLUMN IF NOT EXISTS body_text_2 TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS signatory_name TEXT DEFAULT 'Gaonhae Taekwondo LLP',
  ADD COLUMN IF NOT EXISTS signatory_position TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS signature_image_url TEXT DEFAULT '';