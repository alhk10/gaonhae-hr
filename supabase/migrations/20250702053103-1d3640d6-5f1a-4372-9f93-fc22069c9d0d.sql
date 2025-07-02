
-- First, let's check if there are any employees in the database
SELECT COUNT(*) as total_employees FROM employees;

-- Check the structure and sample data
SELECT id, name, type, resign_date FROM employees LIMIT 5;

-- If no employees exist, let's insert some sample data to test the integration
INSERT INTO employees (
  id, name, email, phone, nric, date_of_birth, address, position, 
  type, residency_status, base_salary, hourly_rate, payment_type, 
  bank_name, bank_account, join_date
) VALUES 
(
  'EMP001', 'John Doe', 'john.doe@company.com', '+65 9123 4567', 
  'S1234567A', '1990-05-15', '123 Marina Bay, Singapore 018956', 
  'Senior Developer', 'Full-Time', 'Citizen', 4500, NULL, 'Monthly',
  'DBS Bank', '123-456789-0', '2022-01-15'
),
(
  'EMP002', 'Jane Smith', 'jane.smith@company.com', '+65 9234 5678',
  'S2345678B', '1985-08-22', '456 Sentosa Cove, Singapore 098234',
  'Project Manager', 'Full-Time', 'PR', 5500, NULL, 'Monthly',
  'OCBC Bank', '234-567890-1', '2021-03-10'
),
(
  'CAS001', 'Lim Zi Han', 'lim.zihan@company.com', '+65 9456 7890',
  'S4567890D', '1995-04-18', '321 Tampines Street 32, Singapore 529323',
  'Part-time Designer', 'Casual', NULL, 25, 'Hourly',
  'DBS Bank', '456-789012-3', '2023-09-15'
),
(
  'CAS002', 'Aw Yi Zhe Eldon', 'aw.yizhe@company.com', '+65 9567 8901',
  'S5678901E', '1988-11-25', '654 Woodlands Drive 62, Singapore 730654',
  'Freelance Consultant', 'Casual', NULL, 30, 'Hourly',
  'OCBC Bank', '567-890123-4', '2023-11-01'
)
ON CONFLICT (id) DO NOTHING;

-- Also insert corresponding admin access and page access records
INSERT INTO admin_access (employee_id, employees, payroll, leave_management, claims, attendance, slot_booking, reports)
VALUES 
('EMP001', true, true, true, true, true, true, true),
('EMP002', false, false, true, true, false, false, false),
('CAS001', false, false, false, false, false, false, false),
('CAS002', false, false, false, false, false, false, false)
ON CONFLICT DO NOTHING;

INSERT INTO employee_page_access (employee_id, profile, apply_leave, submit_claim, payslips, my_attendance, slot_booking_employee)
VALUES 
('EMP001', true, true, true, true, true, true),
('EMP002', true, true, true, true, true, false),
('CAS001', true, true, true, true, true, true),
('CAS002', true, true, true, true, true, true)
ON CONFLICT DO NOTHING;
