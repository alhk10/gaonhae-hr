
-- Create leave encashment configuration table
CREATE TABLE public.leave_encashment_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  encashment_rate_per_day NUMERIC NOT NULL DEFAULT 0,
  max_encashable_days INTEGER DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

-- Create leave encashment records table
CREATE TABLE public.leave_encashment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  unused_leave_days INTEGER NOT NULL DEFAULT 0,
  encashed_days INTEGER NOT NULL DEFAULT 0,
  rate_per_day NUMERIC NOT NULL DEFAULT 0,
  total_encashment_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  processed_date TIMESTAMP WITH TIME ZONE,
  processed_by TEXT,
  payroll_month TEXT,
  payroll_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.leave_encashment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_encashment_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for leave_encashment_config
CREATE POLICY "All authenticated users can view encashment config" 
  ON public.leave_encashment_config 
  FOR SELECT 
  USING (true);

CREATE POLICY "Superadmin can manage encashment config" 
  ON public.leave_encashment_config 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create RLS policies for leave_encashment_records
CREATE POLICY "All authenticated users can view encashment records" 
  ON public.leave_encashment_records 
  FOR SELECT 
  USING (true);

CREATE POLICY "Superadmin can manage encashment records" 
  ON public.leave_encashment_records 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create function to calculate unused leave for encashment
CREATE OR REPLACE FUNCTION public.calculate_unused_leave_for_encashment(
  employee_id TEXT,
  reference_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
) RETURNS TABLE(
  unused_annual_leave INTEGER,
  total_entitlement INTEGER,
  total_used INTEGER
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  entitlement_record RECORD;
  used_leave INTEGER;
BEGIN
  -- Get leave entitlement for the year
  SELECT * INTO entitlement_record
  FROM public.calculate_annual_leave_entitlement(employee_id, reference_year);
  
  -- Calculate used leave for the year
  SELECT COALESCE(SUM(days_requested), 0) INTO used_leave
  FROM public.leave_requests
  WHERE leave_requests.employee_id = calculate_unused_leave_for_encashment.employee_id
    AND status = 'Approved'
    AND type = 'Annual Leave'
    AND EXTRACT(YEAR FROM start_date)::INTEGER = reference_year;
  
  RETURN QUERY SELECT 
    GREATEST(0, entitlement_record.final_annual_leave - used_leave) as unused_annual_leave,
    entitlement_record.final_annual_leave as total_entitlement,
    used_leave as total_used;
END;
$$;

-- Create function to process leave encashment
CREATE OR REPLACE FUNCTION public.process_leave_encashment(
  p_employee_id TEXT,
  p_year INTEGER,
  p_processed_by TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  unused_leave_info RECORD;
  config_record RECORD;
  encashable_days INTEGER;
  total_amount NUMERIC;
  record_id UUID;
BEGIN
  -- Get unused leave calculation
  SELECT * INTO unused_leave_info
  FROM public.calculate_unused_leave_for_encashment(p_employee_id, p_year);
  
  -- Check if there's unused leave to encash
  IF unused_leave_info.unused_annual_leave <= 0 THEN
    RAISE EXCEPTION 'No unused leave available for encashment for employee % in year %', p_employee_id, p_year;
  END IF;
  
  -- Get encashment configuration
  SELECT * INTO config_record
  FROM public.leave_encashment_config
  WHERE employee_id = p_employee_id AND is_active = true;
  
  -- Use default rate if no config found (based on employee's daily salary)
  IF NOT FOUND THEN
    SELECT 
      COALESCE(base_salary / 22, 0) as encashment_rate_per_day,
      NULL as max_encashable_days
    INTO config_record
    FROM public.employees
    WHERE id = p_employee_id;
    
    IF config_record.encashment_rate_per_day = 0 THEN
      RAISE EXCEPTION 'No encashment rate configured and no base salary found for employee %', p_employee_id;
    END IF;
  END IF;
  
  -- Calculate encashable days (respect max limit if set)
  encashable_days := unused_leave_info.unused_annual_leave;
  IF config_record.max_encashable_days IS NOT NULL THEN
    encashable_days := LEAST(encashable_days, config_record.max_encashable_days);
  END IF;
  
  -- Calculate total encashment amount
  total_amount := encashable_days * config_record.encashment_rate_per_day;
  
  -- Create encashment record
  INSERT INTO public.leave_encashment_records (
    employee_id,
    year,
    unused_leave_days,
    encashed_days,
    rate_per_day,
    total_encashment_amount,
    status,
    processed_date,
    processed_by
  ) VALUES (
    p_employee_id,
    p_year,
    unused_leave_info.unused_annual_leave,
    encashable_days,
    config_record.encashment_rate_per_day,
    total_amount,
    'Processed',
    now(),
    p_processed_by
  ) RETURNING id INTO record_id;
  
  RETURN record_id;
END;
$$;

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_encashment_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_leave_encashment_config_updated_at
    BEFORE UPDATE ON public.leave_encashment_config
    FOR EACH ROW EXECUTE FUNCTION public.update_encashment_updated_at();

CREATE TRIGGER update_leave_encashment_records_updated_at
    BEFORE UPDATE ON public.leave_encashment_records
    FOR EACH ROW EXECUTE FUNCTION public.update_encashment_updated_at();
