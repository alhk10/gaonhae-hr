
-- Create location exceptions table for admin overrides
CREATE TABLE public.location_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.location_exceptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all access for authenticated users" 
ON public.location_exceptions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_location_exceptions_updated_at
    BEFORE UPDATE ON public.location_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_location_exceptions_employee_id ON public.location_exceptions(employee_id);
CREATE INDEX idx_location_exceptions_enabled ON public.location_exceptions(enabled);
