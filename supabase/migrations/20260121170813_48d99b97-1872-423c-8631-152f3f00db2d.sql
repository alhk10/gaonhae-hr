-- Add security_pin column to employees table for screen lock feature
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS security_pin text;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.security_pin IS 'Hashed 4-digit PIN for screen lock feature';