-- Remove daily rate columns from employees table
-- First drop the dependent view, then recreate it without those columns

DROP VIEW IF EXISTS active_employees;

ALTER TABLE public.employees DROP COLUMN IF EXISTS daily_weekday_rate;
ALTER TABLE public.employees DROP COLUMN IF EXISTS daily_weekend_rate;
ALTER TABLE public.employees DROP COLUMN IF EXISTS daily_rate;

-- Recreate the active_employees view without the removed columns
CREATE OR REPLACE VIEW active_employees AS
SELECT 
  id, name, nric, date_of_birth, residency_status, type,
  base_salary, hourly_rate, payment_type, bank_account, bank_name,
  department, position, phone, address, email, created_at, updated_at,
  resign_date, join_date, qualifications, display_name
FROM employees
WHERE resign_date IS NULL;