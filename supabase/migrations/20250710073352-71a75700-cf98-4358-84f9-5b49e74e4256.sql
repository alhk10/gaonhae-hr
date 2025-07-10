
-- Fix Function Search Path Mutable security warnings
-- This migration recreates all affected functions with proper search_path settings

-- 1. Fix is_superadmin function
CREATE OR REPLACE FUNCTION public.is_superadmin(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.superadmin_users 
    WHERE employee_email = user_email AND is_active = true
  );
END;
$function$;

-- 2. Fix log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(p_user_email text, p_action text, p_details jsonb DEFAULT NULL::jsonb, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (user_email, action, details, ip_address, user_agent)
  VALUES (p_user_email, p_action, p_details, p_ip_address, p_user_agent);
END;
$function$;

-- 3. Fix update_monday_holiday_flag function
CREATE OR REPLACE FUNCTION public.update_monday_holiday_flag()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Check if the holiday date falls on a Monday (1 = Monday in PostgreSQL)
  NEW.is_monday_holiday := EXTRACT(DOW FROM NEW.date) = 1;
  NEW.year := EXTRACT(YEAR FROM NEW.date);
  RETURN NEW;
END;
$function$;

-- 4. Fix calculate_years_of_service function
CREATE OR REPLACE FUNCTION public.calculate_years_of_service(join_date date, reference_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path = public
AS $function$
BEGIN
  IF join_date IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate full years between join date and reference date
  RETURN EXTRACT(YEAR FROM AGE(reference_date, join_date))::INTEGER;
END;
$function$;

-- 5. Fix calculate_annual_leave_entitlement function
CREATE OR REPLACE FUNCTION public.calculate_annual_leave_entitlement(employee_id text, reference_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer)
 RETURNS TABLE(base_annual_leave integer, years_of_service integer, service_bonus_days integer, total_annual_leave integer, monday_holiday_bonus integer, final_annual_leave integer, medical_leave integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path = public
AS $function$
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
$function$;

-- 6. Fix get_eligible_employees_with_entitlements function
CREATE OR REPLACE FUNCTION public.get_eligible_employees_with_entitlements(reference_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer)
 RETURNS TABLE(employee_id text, employee_name text, employee_type text, employee_position text, join_date date, email text, years_of_service integer, base_annual_leave integer, service_bonus_days integer, total_annual_leave integer, monday_holiday_bonus integer, final_annual_leave integer, medical_leave integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path = public
AS $function$
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
$function$;

-- 7. Fix validate_leave_request function
CREATE OR REPLACE FUNCTION public.validate_leave_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
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
$function$;

-- 8. Fix calculate_unused_leave_for_encashment function
CREATE OR REPLACE FUNCTION public.calculate_unused_leave_for_encashment(employee_id text, reference_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer)
 RETURNS TABLE(unused_annual_leave integer, total_entitlement integer, total_used integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path = public
AS $function$
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
$function$;

-- 9. Fix process_leave_encashment function
CREATE OR REPLACE FUNCTION public.process_leave_encashment(p_employee_id text, p_year integer, p_processed_by text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
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
$function$;

-- 10. Fix update_encashment_updated_at function
CREATE OR REPLACE FUNCTION public.update_encashment_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 11. Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Add comment to document the security fix
COMMENT ON FUNCTION public.is_superadmin(text) IS 'Security hardened function with explicit search_path';
COMMENT ON FUNCTION public.log_security_event(text, text, jsonb, text, text) IS 'Security hardened function with explicit search_path';
COMMENT ON FUNCTION public.calculate_years_of_service(date, date) IS 'Security hardened function with explicit search_path';
COMMENT ON FUNCTION public.calculate_annual_leave_entitlement(text, integer) IS 'Security hardened function with explicit search_path';
COMMENT ON FUNCTION public.get_eligible_employees_with_entitlements(integer) IS 'Security hardened function with explicit search_path';
COMMENT ON FUNCTION public.validate_leave_request() IS 'Security hardened function with explicit search_path';
COMMENT ON FUNCTION public.calculate_unused_leave_for_encashment(text, integer) IS 'Security hardened function with explicit search_path';
COMMENT ON FUNCTION public.process_leave_encashment(text, integer, text) IS 'Security hardened function with explicit search_path';
COMMENT ON FUNCTION public.update_encashment_updated_at() IS 'Security hardened function with explicit search_path';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Security hardened function with explicit search_path';
COMMENT ON FUNCTION public.update_monday_holiday_flag() IS 'Security hardened function with explicit search_path';
