
-- Add foreign key constraint between employee_page_access and employees tables
ALTER TABLE employee_page_access 
ADD CONSTRAINT employee_page_access_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id);

-- Also ensure the admin_access table has the proper foreign key
ALTER TABLE admin_access 
ADD CONSTRAINT admin_access_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id);

-- Add foreign key for allowances table
ALTER TABLE allowances 
ADD CONSTRAINT allowances_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id);

-- Add foreign key for deductions table
ALTER TABLE deductions 
ADD CONSTRAINT deductions_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id);

-- Add foreign key for certificates table
ALTER TABLE certificates 
ADD CONSTRAINT certificates_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id);
