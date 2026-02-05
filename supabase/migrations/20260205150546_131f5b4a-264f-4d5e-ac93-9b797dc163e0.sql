ALTER TABLE public.letter_templates 
  ADD COLUMN IF NOT EXISTS addressee_name text DEFAULT '{fullName}',
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS salutation text DEFAULT 'To Whom It May Concern';