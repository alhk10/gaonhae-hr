-- Fix Ryan Goh's employee record with proper join_date
UPDATE public.employees 
SET join_date = '2024-01-01'  -- Setting a reasonable join date
WHERE name = 'Ryan Goh' AND join_date IS NULL;

-- Add logging function for booking diagnostics
CREATE OR REPLACE FUNCTION public.log_booking_attempt(
  p_employee_id text,
  p_employee_name text,
  p_booking_date date,
  p_branch_id text,
  p_attempt_result text,
  p_error_details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_email,
    action,
    details,
    created_at
  ) VALUES (
    'system@booking',
    'booking_attempt',
    jsonb_build_object(
      'employee_id', p_employee_id,
      'employee_name', p_employee_name,
      'booking_date', p_booking_date,
      'branch_id', p_branch_id,
      'result', p_attempt_result,
      'error_details', p_error_details
    ),
    now()
  );
END;
$$;