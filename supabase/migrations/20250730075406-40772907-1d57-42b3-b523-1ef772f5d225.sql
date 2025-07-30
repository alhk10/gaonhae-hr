-- Fix foreign key constraint issues and update emergency booking functions with correct employee IDs

-- Drop and recreate the emergency booking function for Ryan with correct employee ID
DROP FUNCTION IF EXISTS public.force_book_ryan_slots();

CREATE OR REPLACE FUNCTION public.force_book_ryan_slots() RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ryan_employee_id text := 'EMP1751006984631';  -- Correct Ryan's employee ID
  jurong_west_branch_id text := 'jurong-west';
  booking_dates date[] := ARRAY[
    '2025-08-05'::date, '2025-08-06'::date, '2025-08-07'::date, '2025-08-09'::date,
    '2025-08-12'::date, '2025-08-13'::date, '2025-08-14'::date, '2025-08-16'::date,
    '2025-08-19'::date, '2025-08-20'::date, '2025-08-21'::date, '2025-08-23'::date,
    '2025-08-26'::date, '2025-08-27'::date, '2025-08-28'::date, '2025-08-30'::date
  ];
  booking_date date;
  booking_count integer := 0;
  error_count integer := 0;
  existing_booking record;
  result jsonb;
BEGIN
  FOREACH booking_date IN ARRAY booking_dates
  LOOP
    -- Check if booking already exists
    SELECT * INTO existing_booking
    FROM public.slot_bookings_new
    WHERE employee_id = ryan_employee_id
      AND date = booking_date
      AND status != 'cancelled';
    
    IF existing_booking IS NULL THEN
      -- Create the booking with correct employee ID
      INSERT INTO public.slot_bookings_new (
        id,
        employee_id,
        employee_name,
        branch_id,
        branch_name,
        date,
        status,
        notes,
        booked_on,
        approved_on,
        approved_by
      ) VALUES (
        'RYAN_' || extract(epoch from now())::text || '_' || to_char(booking_date, 'YYYY-MM-DD'),
        ryan_employee_id,
        'Goh Jun Jie Ryan',
        jurong_west_branch_id,
        'Jurong West',
        booking_date,
        'approved',
        'Emergency booking - Admin override',
        CURRENT_DATE,
        CURRENT_DATE,
        'System Admin'
      );
      
      booking_count := booking_count + 1;
      
      -- Log the successful booking
      PERFORM public.log_booking_attempt(
        ryan_employee_id,
        'Goh Jun Jie Ryan',
        booking_date,
        jurong_west_branch_id,
        'success_emergency',
        jsonb_build_object('method', 'admin_override')
      );
    ELSE
      error_count := error_count + 1;
    END IF;
  END LOOP;
  
  result := jsonb_build_object(
    'total_requested', array_length(booking_dates, 1),
    'bookings_created', booking_count,
    'duplicates_skipped', error_count,
    'employee_id', ryan_employee_id,
    'branch', 'Jurong West'
  );
  
  RETURN result;
END;
$$;

-- Create emergency booking function for Eldon with correct employee ID
CREATE OR REPLACE FUNCTION public.force_book_eldon_slots() RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  eldon_employee_id text := 'EMP1751006728858';  -- Correct Eldon's employee ID
  jurong_west_branch_id text := 'jurong-west';
  booking_date date := '2025-08-16'::date;
  existing_booking record;
  result jsonb;
BEGIN
  -- Check if booking already exists
  SELECT * INTO existing_booking
  FROM public.slot_bookings_new
  WHERE employee_id = eldon_employee_id
    AND date = booking_date
    AND status != 'cancelled';
  
  IF existing_booking IS NULL THEN
    -- Create the booking with correct employee ID
    INSERT INTO public.slot_bookings_new (
      id,
      employee_id,
      employee_name,
      branch_id,
      branch_name,
      date,
      status,
      notes,
      booked_on,
      approved_on,
      approved_by
    ) VALUES (
      'ELDON_' || extract(epoch from now())::text || '_' || to_char(booking_date, 'YYYY-MM-DD'),
      eldon_employee_id,
      'Aw Yi Zhe Eldon',
      jurong_west_branch_id,
      'Jurong West',
      booking_date,
      'approved',
      'Emergency booking - Admin override',
      CURRENT_DATE,
      CURRENT_DATE,
      'System Admin'
    );
    
    -- Log the successful booking
    PERFORM public.log_booking_attempt(
      eldon_employee_id,
      'Aw Yi Zhe Eldon',
      booking_date,
      jurong_west_branch_id,
      'success_emergency',
      jsonb_build_object('method', 'admin_override')
    );
    
    result := jsonb_build_object(
      'success', true,
      'bookings_created', 1,
      'employee_id', eldon_employee_id,
      'branch', 'Jurong West',
      'date', booking_date
    );
  ELSE
    result := jsonb_build_object(
      'success', false,
      'error', 'Booking already exists',
      'existing_status', existing_booking.status
    );
  END IF;
  
  RETURN result;
END;
$$;