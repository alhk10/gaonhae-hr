
-- Add Kim Hasung employee record
INSERT INTO employees (
  id,
  name,
  nric,
  date_of_birth,
  residency_status,
  type,
  base_salary,
  payment_type,
  bank_account,
  bank_name,
  department,
  position,
  phone,
  address,
  email,
  created_at,
  updated_at
) VALUES (
  'EMP175086311850',
  'Kim Hasung',
  'S9876543A',
  '1985-03-15',
  'Singapore Permanent Resident',
  'Full-Time',
  4500.00,
  'Monthly',
  '1234-567890',
  'DBS Bank',
  'Teaching',
  'Senior Instructor',
  '+65 9123 4567',
  '123 Taekwondo Street, Singapore 123456',
  'david@gaonhaetaekwondo.com',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  position = EXCLUDED.position,
  updated_at = NOW()
;

-- Add some basic allowances for Kim Hasung
INSERT INTO allowances (employee_id, name, amount, type, created_at) VALUES
  ('EMP175086311850', 'Transport Allowance', 200, 'Fixed', NOW()),
  ('EMP175086311850', 'Meal Allowance', 150, 'Fixed', NOW())
ON CONFLICT DO NOTHING;

-- Add basic deduction
INSERT INTO deductions (employee_id, name, amount, type, created_at) VALUES
  ('EMP175086311850', 'Insurance Premium', 100, 'Fixed', NOW())
ON CONFLICT DO NOTHING;
