-- Drop the existing check constraint on allowances table
ALTER TABLE allowances DROP CONSTRAINT IF EXISTS allowances_type_check;

-- Add new check constraint that includes 'Adhoc' type
ALTER TABLE allowances ADD CONSTRAINT allowances_type_check 
CHECK (type IN ('Fixed', 'Percentage', 'Manual', 'Adhoc'));

-- Also update deductions table constraint to be consistent
ALTER TABLE deductions DROP CONSTRAINT IF EXISTS deductions_type_check;

-- Add new check constraint for deductions that includes 'Adhoc' type
ALTER TABLE deductions ADD CONSTRAINT deductions_type_check 
CHECK (type IN ('Fixed', 'Percentage', 'Manual', 'Adhoc'));