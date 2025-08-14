-- Allow null employee_id for period-level payroll records
ALTER TABLE payroll_records ALTER COLUMN employee_id DROP NOT NULL;

-- Drop the foreign key constraint that's causing the issue
ALTER TABLE payroll_records DROP CONSTRAINT IF EXISTS payroll_records_employee_id_fkey;

-- Add a new foreign key constraint that allows null values
ALTER TABLE payroll_records 
ADD CONSTRAINT payroll_records_employee_id_fkey 
FOREIGN KEY (employee_id) 
REFERENCES employees(id) 
DEFERRABLE;