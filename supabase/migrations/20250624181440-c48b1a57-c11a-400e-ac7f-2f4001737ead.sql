
-- Create employees table
CREATE TABLE public.employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nric TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  residency_status TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Full-Time', 'Casual')),
  base_salary DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  daily_rate DECIMAL(10,2),
  payment_type TEXT CHECK (payment_type IN ('Monthly', 'Hourly', 'Daily')),
  bank_account TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  phone TEXT,
  address TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create allowances table
CREATE TABLE public.allowances (
  id SERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT DEFAULT 'Fixed' CHECK (type IN ('Fixed', 'Percentage', 'Manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deductions table
CREATE TABLE public.deductions (
  id SERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT DEFAULT 'Fixed' CHECK (type IN ('Fixed', 'Percentage', 'Manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_access table
CREATE TABLE public.admin_access (
  id SERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
  employees BOOLEAN DEFAULT FALSE,
  payroll BOOLEAN DEFAULT FALSE,
  leave_management BOOLEAN DEFAULT FALSE,
  claims BOOLEAN DEFAULT FALSE,
  attendance BOOLEAN DEFAULT FALSE,
  slot_booking BOOLEAN DEFAULT FALSE,
  reports BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create certificates table
CREATE TABLE public.certificates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE public.attendance (
  id SERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  break_start TIME,
  break_end TIME,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Half Day', 'Late')),
  hours_worked DECIMAL(4,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Annual', 'Medical', 'Emergency', 'Maternity', 'Paternity')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  applied_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_date TIMESTAMP WITH TIME ZONE,
  medical_certificate TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claims table
CREATE TABLE public.claims (
  id SERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Transport', 'Medical', 'Meal', 'Equipment', 'Training', 'Other')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  submitted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create slot_bookings table
CREATE TABLE public.slot_bookings (
  id SERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Booked' CHECK (status IN ('Booked', 'Completed', 'Cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data from your existing data
INSERT INTO public.employees (id, name, nric, date_of_birth, residency_status, type, base_salary, payment_type, bank_account, bank_name, department, position, phone, address, email) VALUES
('EMP001', 'John Tan', 'S1234567A', '1990-05-15', 'Singapore Citizen', 'Full-Time', 8500.00, 'Monthly', '1234-567890', 'DBS Bank', 'Engineering', 'Senior Developer', '+65 9123 4567', '123 Orchard Road, #12-34, Singapore 238858', 'john.tan@company.sg'),
('EMP002', 'Mary Ng', 'S2345678B', '1988-08-22', 'Permanent Resident Year 2', 'Full-Time', 7200.00, 'Monthly', '2345-678901', 'OCBC Bank', 'Marketing', 'Marketing Manager', '+65 9234 5678', '456 Marina Bay, #08-21, Singapore 018956', 'mary.ng@company.sg'),
('EMP003', 'David Lim', 'S3456789C', '1992-03-10', 'Singapore Citizen', 'Full-Time', 3800.00, 'Monthly', '3456-789012', 'UOB Bank', 'Operations', 'Operations Assistant', '+65 9345 6789', '789 Jurong East, #15-67, Singapore 609729', 'david.lim@company.sg'),
('CAS001', 'Alice Wong', 'S4567890D', '1995-03-10', 'Singapore Citizen', 'Casual', NULL, 'Hourly', '4567-890123', 'UOB Bank', 'Teaching', 'Casual Teacher', '+65 9456 7890', '321 Tampines, #22-11, Singapore 529543', 'alice.wong@company.sg'),
('CAS002', 'Bob Chen', 'S5678901E', '1992-11-25', 'Permanent Resident Year 1', 'Casual', NULL, 'Daily', '5678-901234', 'DBS Bank', 'Teaching', 'Casual Teacher', '+65 9567 8901', '654 Woodlands, #05-43, Singapore 730654', 'bob.chen@company.sg'),
('CAS003', 'Sarah Lee', 'S6789012F', '1993-07-18', 'Singapore Citizen', 'Casual', NULL, 'Hourly', '6789-012345', 'OCBC Bank', 'Teaching', 'Casual Teacher', '+65 9678 9012', '987 Yishun, #18-29, Singapore 760987', 'sarah.lee@company.sg');

-- Update casual employees with rates
UPDATE public.employees SET hourly_rate = 25.00 WHERE id = 'CAS001';
UPDATE public.employees SET daily_rate = 180.00 WHERE id = 'CAS002';
UPDATE public.employees SET hourly_rate = 28.00 WHERE id = 'CAS003';

-- Insert allowances
INSERT INTO public.allowances (employee_id, name, amount, type) VALUES
('EMP001', 'Transport Allowance', 200.00, 'Fixed'),
('EMP001', 'Meal Allowance', 150.00, 'Fixed'),
('EMP002', 'Transport Allowance', 200.00, 'Fixed'),
('EMP002', 'Meal Allowance', 150.00, 'Fixed'),
('EMP003', 'Transport Allowance', 200.00, 'Fixed'),
('EMP003', 'Meal Allowance', 150.00, 'Fixed'),
('CAS001', 'Performance Bonus', 100.00, 'Fixed'),
('CAS002', 'Performance Bonus', 80.00, 'Fixed'),
('CAS003', 'Performance Bonus', 60.00, 'Fixed');

-- Insert deductions
INSERT INTO public.deductions (employee_id, name, amount, type) VALUES
('EMP001', 'Insurance', 100.00, 'Fixed'),
('EMP002', 'Insurance', 50.00, 'Fixed'),
('EMP003', 'Insurance', 100.00, 'Fixed');

-- Insert admin access permissions
INSERT INTO public.admin_access (employee_id, employees, attendance, reports) VALUES
('EMP001', TRUE, TRUE, TRUE);

INSERT INTO public.admin_access (employee_id, leave_management, claims, reports) VALUES
('EMP002', TRUE, TRUE, TRUE);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (temporary permissive policies - you'll need to set up proper auth later)
CREATE POLICY "Enable all access for authenticated users" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.allowances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.deductions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.admin_access FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.claims FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.slot_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for employees table
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
