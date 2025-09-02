-- Fix security issue with the view
-- Remove the view and recreate it without SECURITY DEFINER (views should not have this property)

DROP VIEW IF EXISTS public.active_employees;

-- Create a simple view for active employees (no SECURITY DEFINER needed)
CREATE VIEW public.active_employees AS
SELECT *
FROM public.employees
WHERE resign_date IS NULL OR resign_date > CURRENT_DATE;