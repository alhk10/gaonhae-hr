-- Create products table for milestone 5 product management
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT UNIQUE,
    product_type TEXT NOT NULL DEFAULT 'class', -- 'class', 'course', 'merchandise'
    category_id UUID,
    belt_level TEXT, -- for classes/courses
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    has_sessions BOOLEAN DEFAULT false,
    max_sessions INTEGER,
    session_duration_minutes INTEGER,
    has_size_variants BOOLEAN DEFAULT false,
    size_options TEXT[], -- for merchandise
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- Create inventory locations table
CREATE TABLE public.inventory_locations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    branch_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_by TEXT
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "superadmin_manage_products" 
ON public.products 
FOR ALL 
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "view_active_products" 
ON public.products 
FOR SELECT 
USING (is_active = true);

-- Create policies for inventory locations
CREATE POLICY "superadmin_manage_inventory_locations" 
ON public.inventory_locations 
FOR ALL 
USING (get_current_user_role() = 'superadmin')
WITH CHECK (get_current_user_role() = 'superadmin');

CREATE POLICY "view_active_inventory_locations" 
ON public.inventory_locations 
FOR SELECT 
USING (is_active = true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_locations_updated_at
    BEFORE UPDATE ON public.inventory_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key reference for products to categories
ALTER TABLE public.products 
ADD CONSTRAINT fk_products_category 
FOREIGN KEY (category_id) 
REFERENCES public.product_categories(id);

-- Insert default inventory location
INSERT INTO public.inventory_locations (name, address, branch_id, created_by)
VALUES ('Main Warehouse', 'Default location', 'main', 'system');

-- Insert sample product categories if they don't exist
INSERT INTO public.product_categories (name, description, created_by)
VALUES 
    ('Classes', 'Regular martial arts classes', 'system'),
    ('Courses', 'Specialized training courses', 'system'),
    ('Merchandise', 'Physical products and equipment', 'system')
ON CONFLICT DO NOTHING;