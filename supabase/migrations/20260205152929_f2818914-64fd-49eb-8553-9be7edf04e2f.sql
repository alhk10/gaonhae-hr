ALTER TABLE public.letter_templates 
  ADD COLUMN IF NOT EXISTS show_horizontal_line boolean DEFAULT false;