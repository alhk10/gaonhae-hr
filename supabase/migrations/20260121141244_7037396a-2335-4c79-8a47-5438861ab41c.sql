-- Create product_variant_types table for configurable variant types
CREATE TABLE public.product_variant_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  presets jsonb DEFAULT '[]'::jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_variant_types ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view active variant types"
ON public.product_variant_types FOR SELECT
USING (is_active = true);

CREATE POLICY "Superadmin can manage variant types"
ON public.product_variant_types FOR ALL
USING (get_current_user_role() = 'superadmin'::text)
WITH CHECK (get_current_user_role() = 'superadmin'::text);

-- Insert default variant types with presets
INSERT INTO public.product_variant_types (name, code, presets, sort_order) VALUES
('Size', 'size', '[
  {"name": "Clothing Sizes", "options": ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]},
  {"name": "Number Sizes", "options": ["0", "1", "2", "3", "4", "5", "6", "7", "8"]},
  {"name": "Children Sizes", "options": ["2T", "3T", "4T", "5T", "6", "7", "8", "10", "12", "14", "16"]},
  {"name": "Shoe Sizes", "options": ["5", "6", "7", "8", "9", "10", "11", "12", "13"]},
  {"name": "Age Groups", "options": ["Toddler", "Kids", "Youth", "Adult"]}
]'::jsonb, 1),
('Color', 'color', '[
  {"name": "Uniform Colors", "options": ["White", "Black", "Red", "Blue", "Yellow", "Green", "Orange", "Purple"]},
  {"name": "Dobok Colors", "options": ["White", "Black", "Red/Black", "White/Black"]}
]'::jsonb, 2),
('Belt Rank', 'belt_rank', '[
  {"name": "Foundation", "options": ["Foundation 1", "Foundation 2", "Foundation 3"]},
  {"name": "Color Belts", "options": ["White", "Yellow Tip", "Yellow", "Green Tip", "Green", "Blue Tip", "Blue", "Red Tip", "Red", "Black Tip"]},
  {"name": "Dan Ranks", "options": ["Dan 1", "Dan 2", "Dan 3", "Dan 4", "Dan 5"]},
  {"name": "Poom Ranks", "options": ["Poom 1", "Poom 2", "Poom 3", "Poom 4"]}
]'::jsonb, 3);

-- Add variant columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS available_variants jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS requires_color boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_belt_rank boolean DEFAULT false;

-- Update inventory_items to support variant combinations
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS variant_combination jsonb DEFAULT NULL;

-- Create index for faster variant lookups
CREATE INDEX IF NOT EXISTS idx_inventory_variant_combination 
ON public.inventory_items USING GIN (variant_combination);

-- Create trigger for updated_at on product_variant_types
CREATE TRIGGER update_product_variant_types_updated_at
BEFORE UPDATE ON public.product_variant_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();