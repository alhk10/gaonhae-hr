
-- Create payroll_records table to store historical payroll data
CREATE TABLE public.payroll_records (
  id TEXT NOT NULL PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id),
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  payroll_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_payroll_records_employee_id ON public.payroll_records(employee_id);
CREATE INDEX idx_payroll_records_year_month ON public.payroll_records(year, month);

-- Enable Row Level Security
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth requirements)
CREATE POLICY "Users can view payroll records" ON public.payroll_records
  FOR SELECT USING (true);

CREATE POLICY "Users can insert payroll records" ON public.payroll_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update payroll records" ON public.payroll_records
  FOR UPDATE USING (true);
