
-- Add daily weekday and weekend rate columns to employees table
ALTER TABLE public.employees 
ADD COLUMN daily_weekday_rate numeric,
ADD COLUMN daily_weekend_rate numeric;
