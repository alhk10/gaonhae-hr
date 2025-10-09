-- Add display_name column to employees table
ALTER TABLE employees 
ADD COLUMN display_name text;

-- Set existing display names to match current names
UPDATE employees 
SET display_name = name 
WHERE display_name IS NULL;

-- Add comment explaining the field
COMMENT ON COLUMN employees.display_name IS 'Display name used when showing employee names in the system. Defaults to full name but can be customized.';