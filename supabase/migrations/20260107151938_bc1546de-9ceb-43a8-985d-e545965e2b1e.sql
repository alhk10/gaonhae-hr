-- Add cost_price and quantity columns to branch_profit_loss_entries
ALTER TABLE branch_profit_loss_entries
ADD COLUMN cost_price numeric DEFAULT NULL,
ADD COLUMN quantity numeric DEFAULT 1;