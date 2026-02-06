-- Drop the unique constraint that prevents duplicate categories
ALTER TABLE public.branch_profit_loss_entries 
DROP CONSTRAINT IF EXISTS branch_profit_loss_entries_branch_id_month_year_category_su_key;

-- Add a new index for performance (without unique constraint)
CREATE INDEX IF NOT EXISTS idx_branch_profit_loss_entries_lookup 
ON public.branch_profit_loss_entries (branch_id, month, year, category, subcategory);