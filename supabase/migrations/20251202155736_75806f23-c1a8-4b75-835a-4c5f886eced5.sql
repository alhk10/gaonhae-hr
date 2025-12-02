-- Clear base_salary for all casual employees since they now use dynamic pricing
UPDATE public.employees 
SET base_salary = NULL 
WHERE type = 'Casual' AND base_salary IS NOT NULL;