ALTER TABLE public.ai_marketing_assets
  ADD COLUMN IF NOT EXISTS logo_choice text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS reference_paths text[];