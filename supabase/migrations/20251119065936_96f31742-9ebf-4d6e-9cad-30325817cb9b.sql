-- Allow admin override for past date bookings
-- Update the validate_booking_date function to skip validation for admin bookings

CREATE OR REPLACE FUNCTION public.validate_booking_date()
RETURNS trigger
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check for INSERT operations and future dates
  -- Skip validation for admin bookings (identified by ADMIN_ prefix in ID or admin notes)
  IF TG_OP = 'INSERT' AND NEW.date < CURRENT_DATE THEN
    -- Allow if this is an admin booking (has ADMIN_ prefix or contains "Admin booking" in notes)
    IF NEW.id LIKE 'ADMIN_%' OR 
       NEW.notes ILIKE '%Admin booking%' OR 
       NEW.notes ILIKE '%admin override%' OR
       NEW.notes ILIKE '%Bulk booking created by Admin%' THEN
      -- Admin booking, allow past dates
      RETURN NEW;
    END IF;
    
    -- Regular booking, enforce date constraint
    RAISE EXCEPTION 'Booking date cannot be in the past';
  END IF;
  
  RETURN NEW;
END;
$$;