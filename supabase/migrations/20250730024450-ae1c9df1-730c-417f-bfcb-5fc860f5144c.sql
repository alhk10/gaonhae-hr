-- Fix security issues from previous migration

-- Fix the search path for the log_booking_failure function
CREATE OR REPLACE FUNCTION log_booking_failure(
  employee_email text,
  employee_name text,
  booking_date date,
  branch_id text,
  failure_reason text,
  system_details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_email,
    action,
    details,
    created_at
  ) VALUES (
    employee_email,
    'booking_failure',
    jsonb_build_object(
      'employee_name', employee_name,
      'booking_date', booking_date,
      'branch_id', branch_id,
      'failure_reason', failure_reason,
      'system_details', system_details
    ),
    now()
  );
END;
$$;