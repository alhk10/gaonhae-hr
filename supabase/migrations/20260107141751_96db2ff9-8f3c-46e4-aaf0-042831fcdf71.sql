-- Create table for branch profit and loss entries
CREATE TABLE public.branch_profit_loss_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id VARCHAR NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    category VARCHAR NOT NULL,
    subcategory VARCHAR NOT NULL,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    share_percentage NUMERIC(5,2) DEFAULT 100 CHECK (share_percentage >= 0 AND share_percentage <= 100),
    type VARCHAR NOT NULL CHECK (type IN ('revenue', 'expense')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by VARCHAR,
    updated_by VARCHAR,
    UNIQUE(branch_id, month, year, category, subcategory, type)
);

-- Enable Row Level Security
ALTER TABLE public.branch_profit_loss_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access for authenticated users" 
ON public.branch_profit_loss_entries 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.branch_profit_loss_entries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON public.branch_profit_loss_entries 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete for authenticated users" 
ON public.branch_profit_loss_entries 
FOR DELETE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_branch_pl_entries_lookup ON public.branch_profit_loss_entries(branch_id, month, year);

-- Create trigger for updating updated_at
CREATE TRIGGER update_branch_profit_loss_entries_updated_at
BEFORE UPDATE ON public.branch_profit_loss_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();