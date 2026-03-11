ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_age integer DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_age integer DEFAULT NULL;