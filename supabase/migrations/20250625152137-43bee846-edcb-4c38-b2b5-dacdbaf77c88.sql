
-- Create system_allowances table for predefined allowance types
CREATE TABLE public.system_allowances (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create system_deductions table for predefined deduction types  
CREATE TABLE public.system_deductions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert some default allowances
INSERT INTO public.system_allowances (name, description, default_amount) VALUES
('Transport Allowance', 'Monthly transport allowance', 200),
('Meal Allowance', 'Daily meal allowance', 15),
('Mobile Allowance', 'Monthly mobile phone allowance', 50),
('Overtime Allowance', 'Overtime work allowance', 0),
('Performance Bonus', 'Performance-based bonus', 0);

-- Insert some default deductions
INSERT INTO public.system_deductions (name, description, default_amount) VALUES
('Late Deduction', 'Deduction for late arrival', 50),
('Absent Deduction', 'Deduction for absence', 100),
('Uniform Deduction', 'Uniform cost deduction', 25),
('Equipment Damage', 'Equipment damage penalty', 0),
('Other Deduction', 'Miscellaneous deductions', 0);

-- Enable RLS for both tables
ALTER TABLE public.system_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_deductions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow read access (these are system-wide settings)
CREATE POLICY "Allow read access to system allowances" 
  ON public.system_allowances FOR SELECT 
  USING (true);

CREATE POLICY "Allow read access to system deductions" 
  ON public.system_deductions FOR SELECT 
  USING (true);
