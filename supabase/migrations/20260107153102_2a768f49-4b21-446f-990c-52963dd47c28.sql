-- Add sales_amount and discount_percentage columns for revenue calculation
ALTER TABLE public.branch_profit_loss_entries 
ADD COLUMN IF NOT EXISTS sales_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0;