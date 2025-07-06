
-- Update leave policy to 14 base days + 1 per year of service (max 18 days)
-- Create function to calculate years of service
CREATE OR REPLACE FUNCTION public.calculate_years_of_service(join_date DATE, reference_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF join_date IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate full years between join date and reference date
  RETURN EXTRACT(YEAR FROM AGE(reference_date, join_date))::INTEGER;
END;
$$;

-- Create function to calculate annual leave entitlement based on new policy
CREATE OR REPLACE FUNCTION public.calculate_annual_leave_entitlement(
  employee_id TEXT,
  reference_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  base_annual_leave INTEGER,
  years_of_service INTEGER,
  service_bonus_days INTEGER,
  total_annual_leave INTEGER,
  monday_holiday_bonus INTEGER,
  final_annual_leave INTEGER,
  medical_leave INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  emp_record RECORD;
  calculated_years INTEGER;
  base_days INTEGER := 14;
  max_total_days INTEGER := 18;
  service_days INTEGER;
  monday_bonus INTEGER := 0;
  pro_rated_base INTEGER;
BEGIN
  -- Get employee data
  SELECT * INTO emp_record
  FROM public.employees
  WHERE id = employee_id;
  
  -- Check if employee exists and is eligible
  IF NOT FOUND OR emp_record.type != 'Full-Time' OR emp_record.position = 'Senior Partner' THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Calculate years of service
  calculated_years := public.calculate_years_of_service(emp_record.join_date, (reference_year || '-12-31')::DATE);
  
  -- Calculate service bonus days (1 per year, but total capped at 18)
  service_days := LEAST(calculated_years, max_total_days - base_days);
  
  -- Pro-rate if joined mid-year
  pro_rated_base := base_days;
  IF emp_record.join_date IS NOT NULL AND EXTRACT(YEAR FROM emp_record.join_date)::INTEGER = reference_year THEN
    pro_rated_base := ROUND((base_days::DECIMAL * (12 - EXTRACT(MONTH FROM emp_record.join_date) + 1)) / 12)::INTEGER;
  END IF;
  
  -- Get Monday holiday bonuses
  SELECT COALESCE(SUM(mhla.bonus_days_granted), 0) INTO monday_bonus
  FROM public.monday_holiday_leave_adjustments mhla
  JOIN public.public_holidays ph ON mhla.holiday_id = ph.id
  WHERE mhla.employee_id = calculate_annual_leave_entitlement.employee_id 
    AND ph.year = reference_year;
  
  RETURN QUERY SELECT 
    pro_rated_base,
    calculated_years,
    service_days,
    LEAST(pro_rated_base + service_days, max_total_days),
    monday_bonus,
    LEAST(pro_rated_base + service_days, max_total_days) + monday_bonus,
    14; -- Medical leave is always 14 days for eligible employees
END;
$$;

-- Create function to get all eligible employees with their leave entitlements
CREATE OR REPLACE FUNCTION public.get_eligible_employees_with_entitlements(
  reference_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  employee_id TEXT,
  employee_name TEXT,
  employee_type TEXT,
  employee_position TEXT,
  join_date DATE,
  email TEXT,
  years_of_service INTEGER,
  base_annual_leave INTEGER,
  service_bonus_days INTEGER,
  total_annual_leave INTEGER,
  monday_holiday_bonus INTEGER,
  final_annual_leave INTEGER,
  medical_leave INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.type,
    e.position,
    e.join_date,
    e.email,
    ale.years_of_service,
    ale.base_annual_leave,
    ale.service_bonus_days,
    ale.total_annual_leave,
    ale.monday_holiday_bonus,
    ale.final_annual_leave,
    ale.medical_leave
  FROM public.employees e
  CROSS JOIN LATERAL public.calculate_annual_leave_entitlement(e.id, reference_year) ale
  WHERE e.type = 'Full-Time' 
    AND (e.position IS NULL OR e.position != 'Senior Partner')
    AND (e.resign_date IS NULL OR EXTRACT(YEAR FROM e.resign_date)::INTEGER >= reference_year)
    AND ale.final_annual_leave > 0;
END;
$$;

-- Create trigger function to validate leave requests against new policy
CREATE OR REPLACE FUNCTION public.validate_leave_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  emp_record RECORD;
  entitlement_record RECORD;
  current_usage INTEGER;
  leave_year INTEGER;
BEGIN
  -- Get employee data
  SELECT * INTO emp_record
  FROM public.employees
  WHERE id = NEW.employee_id;
  
  -- Check if employee is eligible for leave
  IF NOT FOUND OR emp_record.type != 'Full-Time' OR emp_record.position = 'Senior Partner' THEN
    RAISE EXCEPTION 'Employee % is not eligible for leave requests. Only Full-Time employees (excluding Senior Partners) can apply for leave.', NEW.employee_id;
  END IF;
  
  -- Get leave year from start date
  leave_year := EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
  
  -- Get entitlement for this year
  SELECT * INTO entitlement_record
  FROM public.calculate_annual_leave_entitlement(NEW.employee_id, leave_year);
  
  -- Calculate current usage for the leave type in this year
  SELECT COALESCE(SUM(days_requested), 0) INTO current_usage
  FROM public.leave_requests
  WHERE employee_id = NEW.employee_id
    AND status = 'Approved'
    AND type = NEW.type
    AND EXTRACT(YEAR FROM start_date)::INTEGER = leave_year
    AND (TG_OP = 'INSERT' OR id != NEW.id);
  
  -- Validate against entitlement
  IF NEW.type = 'Annual Leave' THEN
    IF current_usage + NEW.days_requested > entitlement_record.final_annual_leave THEN
      RAISE EXCEPTION 'Leave request exceeds annual leave entitlement. Available: %, Requested: %, Current usage: %', 
        entitlement_record.final_annual_leave, NEW.days_requested, current_usage;
    END IF;
  ELSIF NEW.type = 'Medical Leave' THEN
    IF current_usage + NEW.days_requested > entitlement_record.medical_leave THEN
      RAISE EXCEPTION 'Leave request exceeds medical leave entitlement. Available: %, Requested: %, Current usage: %', 
        entitlement_record.medical_leave, NEW.days_requested, current_usage;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for leave request validation
DROP TRIGGER IF EXISTS validate_leave_request_insert ON public.leave_requests;
DROP TRIGGER IF EXISTS validate_leave_request_update ON public.leave_requests;

CREATE TRIGGER validate_leave_request_insert
  BEFORE INSERT ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_leave_request();

CREATE TRIGGER validate_leave_request_update
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_leave_request();
