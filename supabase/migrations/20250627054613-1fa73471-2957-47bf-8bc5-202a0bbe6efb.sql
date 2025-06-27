
-- Create the sequence first
CREATE SEQUENCE IF NOT EXISTS employee_page_access_id_seq;

-- Create the employee_page_access table to store employee page permissions
CREATE TABLE public.employee_page_access (
  id integer NOT NULL DEFAULT nextval('employee_page_access_id_seq'::regclass) PRIMARY KEY,
  employee_id text,
  profile boolean DEFAULT true,
  apply_leave boolean DEFAULT true,
  submit_claim boolean DEFAULT true,
  payslips boolean DEFAULT true,
  my_attendance boolean DEFAULT true,
  slot_booking_employee boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.employee_page_access ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies for now)
CREATE POLICY "Enable read access for all users" ON public.employee_page_access FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.employee_page_access FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.employee_page_access FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.employee_page_access FOR DELETE USING (true);
