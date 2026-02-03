-- Create inventory_orders table for purchase order workflow
CREATE TABLE public.inventory_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
  size_variant TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'received')),
  notes TEXT,
  requested_by TEXT NOT NULL,
  requested_by_email TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_orders
CREATE POLICY "Allow authenticated users to view inventory orders"
ON public.inventory_orders
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create inventory orders"
ON public.inventory_orders
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update inventory orders"
ON public.inventory_orders
FOR UPDATE
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_inventory_orders_updated_at
BEFORE UPDATE ON public.inventory_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate order number
CREATE OR REPLACE FUNCTION public.generate_inventory_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(nextval('inventory_order_seq') AS TEXT), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS inventory_order_seq START 1;

-- Create trigger to auto-generate order number
CREATE TRIGGER generate_inventory_order_number_trigger
BEFORE INSERT ON public.inventory_orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
EXECUTE FUNCTION public.generate_inventory_order_number();

-- Create index for common queries
CREATE INDEX idx_inventory_orders_status ON public.inventory_orders(status);
CREATE INDEX idx_inventory_orders_product_id ON public.inventory_orders(product_id);
CREATE INDEX idx_inventory_orders_location_id ON public.inventory_orders(location_id);
CREATE INDEX idx_inventory_orders_requested_by ON public.inventory_orders(requested_by);