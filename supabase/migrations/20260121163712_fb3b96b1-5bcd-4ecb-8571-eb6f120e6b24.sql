-- Add tax_included column to price_rules for tracking if price includes or excludes tax
ALTER TABLE public.price_rules 
ADD COLUMN tax_included boolean DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.price_rules.tax_included IS 'Whether price includes tax (true) or tax is added on top (false). NULL means use country default.';