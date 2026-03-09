
-- RPC to get employee by email, bypassing RLS for auth flow
CREATE OR REPLACE FUNCTION public.get_employee_by_email_for_auth(p_email text)
RETURNS TABLE(
  id text,
  name text,
  first_name text,
  last_name text,
  email text,
  department text,
  "position" text,
  type text,
  join_date date,
  resign_date date,
  base_salary numeric,
  hourly_rate numeric,
  payment_type text,
  residency_status text,
  display_name text,
  phone text,
  nric text,
  date_of_birth date,
  bank_name text,
  bank_account text,
  address text,
  security_pin text,
  qualifications jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, first_name, last_name, email, department, position, type,
         join_date, resign_date, base_salary, hourly_rate, payment_type, 
         residency_status, display_name, phone, nric, date_of_birth,
         bank_name, bank_account, address, security_pin, qualifications
  FROM public.employees
  WHERE email = p_email
  LIMIT 1;
$$;

-- RPC to get student by auth_user_id, bypassing RLS for auth flow
CREATE OR REPLACE FUNCTION public.get_student_by_auth_id_for_auth(p_auth_user_id uuid, p_email text DEFAULT NULL)
RETURNS TABLE(
  student_id uuid,
  student_name text,
  student_email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try by auth_user_id first
  RETURN QUERY
  SELECT s.id, (COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, ''))::text, COALESCE(s.email, sa.email)
  FROM public.student_auth sa
  JOIN public.students s ON s.id = sa.student_id
  WHERE sa.auth_user_id = p_auth_user_id
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Fallback: try by email
  IF p_email IS NOT NULL THEN
    RETURN QUERY
    SELECT s.id, (COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, ''))::text, COALESCE(s.email, sa.email)
    FROM public.student_auth sa
    JOIN public.students s ON s.id = sa.student_id
    WHERE sa.email = lower(p_email)
    LIMIT 1;
  END IF;
END;
$$;

-- RPC to get linked students by email, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_linked_students_for_auth(p_email text)
RETURNS TABLE(
  student_id uuid,
  student_name text,
  student_email text,
  student_number text,
  current_belt text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, (COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, ''))::text, 
         COALESCE(s.email, sa.email), s.student_number, s.current_belt
  FROM public.student_auth sa
  JOIN public.students s ON s.id = sa.student_id
  WHERE sa.email = lower(p_email)
  ORDER BY (COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, ''));
$$;

-- RPC to get admin access bypassing RLS
CREATE OR REPLACE FUNCTION public.get_admin_access_for_auth(p_employee_id text)
RETURNS TABLE(
  employees boolean,
  payroll boolean,
  leave_management boolean,
  claims boolean,
  attendance boolean,
  slot_booking boolean,
  "slotBooking" boolean,
  reports boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employees, payroll, leave_management, claims, attendance, slot_booking, "slotBooking", reports
  FROM public.admin_access
  WHERE employee_id = p_employee_id
  LIMIT 1;
$$;

-- RPC to get page access bypassing RLS
CREATE OR REPLACE FUNCTION public.get_page_access_for_auth(p_employee_id text)
RETURNS TABLE(
  profile boolean,
  apply_leave boolean,
  submit_claim boolean,
  payslips boolean,
  my_attendance boolean,
  slot_booking_employee boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profile, apply_leave, submit_claim, payslips, my_attendance, slot_booking_employee
  FROM public.employee_page_access
  WHERE employee_id = p_employee_id
  LIMIT 1;
$$;
