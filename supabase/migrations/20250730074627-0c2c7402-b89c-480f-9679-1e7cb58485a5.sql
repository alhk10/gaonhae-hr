-- There are no new tables created, so no RLS policy updates needed
-- The INFO warning is about existing tables, not our migration

-- Now add emergency booking function for Ryan Goh
CREATE OR REPLACE FUNCTION public.force_book_ryan_slots() RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ryan_employee_id text := 'EMP1751003568252';
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
      -- Create the booking
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
        'Ryan Goh',
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
        'Ryan Goh',
        booking_date,
        jurong_west_branch_id,
        'success_emergency',
        jsonb_build_object('method', 'admin_override')
      );
    ELSE
      error_count := error_count + 1;
      
      -- Log the duplicate booking attempt
      PERFORM public.log_booking_attempt(
        ryan_employee_id,
        'Ryan Goh',
        booking_date,
        jurong_west_branch_id,
        'duplicate_booking',
        jsonb_build_object('existing_status', existing_booking.status)
      );
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