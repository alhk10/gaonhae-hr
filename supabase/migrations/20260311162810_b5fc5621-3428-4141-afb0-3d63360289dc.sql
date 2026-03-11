
ALTER TABLE public.notices 
ADD COLUMN IF NOT EXISTS target_age_min integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS target_age_max integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS target_belt_levels text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_product_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_variant text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_amount numeric DEFAULT NULL;
