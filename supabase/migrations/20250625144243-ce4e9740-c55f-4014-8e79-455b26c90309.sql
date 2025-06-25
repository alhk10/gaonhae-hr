
-- First, let's check and fix the database constraints that are causing the errors
-- Looking at the logs, there are type check constraint violations

-- Update leave_requests table to allow more flexible leave types
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_type_check;
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_type_check 
CHECK (type IN ('Annual Leave', 'Medical Leave', 'Emergency Leave', 'Maternity Leave', 'Paternity Leave', 'Sick Leave', 'Compassionate Leave'));

-- Update claims table to allow more flexible claim types
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_type_check;
ALTER TABLE claims ADD CONSTRAINT claims_type_check 
CHECK (type IN ('Travel', 'Meal', 'Medical', 'Accommodation', 'Transport', 'Others', 'Equipment', 'Training'));

-- Update allowances table to allow more flexible types
ALTER TABLE allowances DROP CONSTRAINT IF EXISTS allowances_type_check;
ALTER TABLE allowances ADD CONSTRAINT allowances_type_check 
CHECK (type IS NULL OR type IN ('Fixed', 'Percentage', 'Manual', 'Monthly', 'Annual'));

-- Update deductions table to allow more flexible types
ALTER TABLE deductions DROP CONSTRAINT IF EXISTS deductions_type_check;
ALTER TABLE deductions ADD CONSTRAINT deductions_type_check 
CHECK (type IS NULL OR type IN ('Fixed', 'Percentage', 'Manual', 'Monthly', 'Annual', 'Tax', 'CPF', 'Union'));

-- Make sure all date columns in leave_requests handle the date format properly
-- Update the applied_date to match the expected format
ALTER TABLE leave_requests ALTER COLUMN applied_date SET DEFAULT now();
