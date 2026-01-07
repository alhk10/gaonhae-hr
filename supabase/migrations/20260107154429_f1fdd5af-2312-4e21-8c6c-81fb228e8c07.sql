-- Create table for P&L categories with default cost prices
CREATE TABLE public.pl_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  default_cost_price NUMERIC DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

-- Enable RLS
ALTER TABLE public.pl_categories ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read categories
CREATE POLICY "Anyone can view categories" 
ON public.pl_categories 
FOR SELECT 
USING (true);

-- Allow authenticated users to manage categories
CREATE POLICY "Authenticated users can insert categories" 
ON public.pl_categories 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories" 
ON public.pl_categories 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete categories" 
ON public.pl_categories 
FOR DELETE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_pl_categories_type ON public.pl_categories(type);