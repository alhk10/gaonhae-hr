
-- Create a table for leave type configurations
CREATE TABLE public.leave_types (
  id text NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  max_days integer NOT NULL DEFAULT 0,
  requires_documents boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default leave types to match current system
INSERT INTO public.leave_types (id, name, max_days, requires_documents) VALUES
('annual-leave', 'Annual Leave', 21, false),
('medical-leave', 'Medical Leave', 14, true),
('emergency-leave', 'Emergency Leave', 5, false),
('maternity-leave', 'Maternity Leave', 90, true),
('paternity-leave', 'Paternity Leave', 14, true);

-- Add RLS policies for leave types
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read leave types (they are system-wide settings)
CREATE POLICY "Anyone can view leave types" 
  ON public.leave_types 
  FOR SELECT 
  USING (true);

-- Only allow superadmin to modify leave types (we'll handle this in the application)
CREATE POLICY "Superadmin can modify leave types" 
  ON public.leave_types 
  FOR ALL 
  USING (true);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_leave_types_updated_at
  BEFORE UPDATE ON public.leave_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
