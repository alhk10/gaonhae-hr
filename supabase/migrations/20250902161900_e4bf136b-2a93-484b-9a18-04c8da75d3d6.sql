-- Phase 3: Data cleanup and optimization (fixed)
-- Clean up redundant/duplicate data and add constraints for data quality

-- Clean up old failed login attempts (keep only last 30 days)
DELETE FROM public.failed_login_attempts 
WHERE attempt_time < NOW() - INTERVAL '30 days';

-- Add some helpful constraints for data quality
-- Ensure employee emails are unique where not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email_unique 
ON public.employees (email) WHERE email IS NOT NULL;

-- Ensure slot booking dates are not in the past for new bookings
-- (We'll use a trigger for this instead of CHECK constraint to avoid restoration issues)
CREATE OR REPLACE FUNCTION public.validate_booking_date()
RETURNS trigger
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check for INSERT operations and future dates
  IF TG_OP = 'INSERT' AND NEW.date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Booking date cannot be in the past';
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then create it (PostgreSQL doesn't support IF NOT EXISTS for triggers)
DROP TRIGGER IF EXISTS validate_booking_date_trigger ON public.slot_bookings_new;
CREATE TRIGGER validate_booking_date_trigger
  BEFORE INSERT ON public.slot_bookings_new
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_date();

-- Add data validation for employee records
CREATE OR REPLACE FUNCTION public.validate_employee_data()
RETURNS trigger
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate join date is not in future
  IF NEW.join_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Join date cannot be in the future';
  END IF;
  
  -- Validate resign date is after join date
  IF NEW.resign_date IS NOT NULL AND NEW.join_date IS NOT NULL AND NEW.resign_date <= NEW.join_date THEN
    RAISE EXCEPTION 'Resign date must be after join date';
  END IF;
  
  -- Validate salary is positive
  IF NEW.base_salary IS NOT NULL AND NEW.base_salary <= 0 THEN
    RAISE EXCEPTION 'Base salary must be positive';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_employee_data_trigger ON public.employees;
CREATE TRIGGER validate_employee_data_trigger
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.validate_employee_data();

-- Create a view for active employees (commonly used query)
CREATE OR REPLACE VIEW public.active_employees AS
SELECT *
FROM public.employees
WHERE resign_date IS NULL OR resign_date > CURRENT_DATE;

-- Add comment to mark old slot_bookings table as deprecated
COMMENT ON TABLE public.slot_bookings IS 'DEPRECATED: Use slot_bookings_new instead. This table is kept for historical data only.';