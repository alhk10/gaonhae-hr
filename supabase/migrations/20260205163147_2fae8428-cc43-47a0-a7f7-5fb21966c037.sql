-- Add first_name and last_name columns to employees table
ALTER TABLE public.employees
ADD COLUMN first_name text,
ADD COLUMN last_name text;

-- Populate first_name and last_name from existing name column
-- Split on first space: everything before first space = first_name, rest = last_name
UPDATE public.employees
SET 
  first_name = UPPER(SPLIT_PART(name, ' ', 1)),
  last_name = UPPER(NULLIF(TRIM(SUBSTRING(name FROM POSITION(' ' IN name) + 1)), ''));

-- Make first_name NOT NULL after populating (use COALESCE to handle any nulls)
UPDATE public.employees SET first_name = UPPER(COALESCE(first_name, name, 'UNKNOWN')) WHERE first_name IS NULL;

-- Add NOT NULL constraint to first_name
ALTER TABLE public.employees ALTER COLUMN first_name SET NOT NULL;

-- Ensure all existing name data is uppercase
UPDATE public.employees SET name = UPPER(name) WHERE name IS NOT NULL;
UPDATE public.employees SET nric = UPPER(nric) WHERE nric IS NOT NULL;
UPDATE public.employees SET address = UPPER(address) WHERE address IS NOT NULL;
UPDATE public.employees SET bank_name = UPPER(bank_name) WHERE bank_name IS NOT NULL;
UPDATE public.employees SET bank_account = UPPER(bank_account) WHERE bank_account IS NOT NULL;
UPDATE public.employees SET position = UPPER(position) WHERE position IS NOT NULL;
UPDATE public.employees SET department = UPPER(department) WHERE department IS NOT NULL;