-- Add sort_order column to pl_categories for category ordering
ALTER TABLE public.pl_categories 
ADD COLUMN sort_order integer DEFAULT 0;

-- Create index for efficient ordering
CREATE INDEX idx_pl_categories_sort_order ON public.pl_categories(type, sort_order, name);