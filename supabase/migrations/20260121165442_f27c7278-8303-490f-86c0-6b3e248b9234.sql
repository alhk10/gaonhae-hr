-- Add is_service flag to products table
-- Services don't track inventory and never run out of stock
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_service boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.products.is_service IS 'When true, product is a service that does not track inventory';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_products_is_service ON public.products(is_service);