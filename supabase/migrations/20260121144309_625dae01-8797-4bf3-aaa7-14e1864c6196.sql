-- Add tax_rate to price_rules for branch-specific tax rates
ALTER TABLE public.price_rules 
ADD COLUMN tax_rate numeric(5,2) DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.price_rules.tax_rate IS 'Branch-specific tax rate override. NULL means use product default.';