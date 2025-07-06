
-- Create public holidays table
CREATE TABLE public.public_holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  date date NOT NULL UNIQUE,
  is_monday_holiday boolean NOT NULL DEFAULT false,
  year integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for efficient date queries
CREATE INDEX idx_public_holidays_date ON public.public_holidays(date);
CREATE INDEX idx_public_holidays_year ON public.public_holidays(year);

-- Create monday holiday leave adjustments tracking table
CREATE TABLE public.monday_holiday_leave_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  holiday_id uuid NOT NULL REFERENCES public.public_holidays(id) ON DELETE CASCADE,
  bonus_days_granted integer NOT NULL DEFAULT 1,
  granted_date timestamp with time zone DEFAULT now(),
  UNIQUE(employee_id, holiday_id)
);

-- Create index for efficient employee queries
CREATE INDEX idx_monday_holiday_adjustments_employee ON public.monday_holiday_leave_adjustments(employee_id);

-- Enable RLS on public holidays table
ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public holidays (superadmin only can modify, all can view)
CREATE POLICY "Anyone can view public holidays" 
  ON public.public_holidays 
  FOR SELECT 
  USING (true);

CREATE POLICY "Superadmin can manage public holidays" 
  ON public.public_holidays 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Enable RLS on monday holiday leave adjustments table
ALTER TABLE public.monday_holiday_leave_adjustments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for monday holiday leave adjustments
CREATE POLICY "All authenticated users can view monday holiday adjustments" 
  ON public.monday_holiday_leave_adjustments 
  FOR SELECT 
  USING (true);

CREATE POLICY "Superadmin can manage monday holiday adjustments" 
  ON public.monday_holiday_leave_adjustments 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_public_holidays_updated_at
  BEFORE UPDATE ON public.public_holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically detect Monday holidays and update is_monday_holiday flag
CREATE OR REPLACE FUNCTION public.update_monday_holiday_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the holiday date falls on a Monday (1 = Monday in PostgreSQL)
  NEW.is_monday_holiday := EXTRACT(DOW FROM NEW.date) = 1;
  NEW.year := EXTRACT(YEAR FROM NEW.date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set Monday holiday flag
CREATE TRIGGER set_monday_holiday_flag
  BEFORE INSERT OR UPDATE ON public.public_holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_monday_holiday_flag();
