
-- Fix foreign key relationships for employee-related tables
-- These relationships are needed for the JOIN queries to work properly

-- Add foreign key constraints for allowances table
ALTER TABLE allowances 
ADD CONSTRAINT allowances_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- Add foreign key constraints for deductions table  
ALTER TABLE deductions 
ADD CONSTRAINT deductions_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- Add foreign key constraints for admin_access table
ALTER TABLE admin_access 
ADD CONSTRAINT admin_access_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- Add foreign key constraints for employee_page_access table
ALTER TABLE employee_page_access 
ADD CONSTRAINT employee_page_access_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- Add foreign key constraints for certificates table
ALTER TABLE certificates 
ADD CONSTRAINT certificates_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
