-- Fix authentication issues and create manual bookings for Jason Lu and Eldon

-- Create auth accounts for Jason Lu and Eldon if they don't exist
-- This will be handled by the service calls

-- Insert manual approved bookings for Jason Lu (August 3rd and 10th, 2025)
INSERT INTO slot_bookings_new (
  id, employee_id, employee_name, branch_id, branch_name, 
  date, status, notes, approved_by, approved_on, booked_on, created_at, updated_at
) VALUES 
(
  'ADMIN_JASON_' || extract(epoch from now())::text,
  'EMP1751007228999',
  'Jason Lu Lijie',
  'balmoral',
  'Balmoral',
  '2025-08-03',
  'approved',
  'Admin override booking - manually created due to system issues',
  'System Admin',
  CURRENT_DATE,
  CURRENT_DATE,
  now(),
  now()
),
(
  'ADMIN_JASON_2_' || extract(epoch from now())::text,
  'EMP1751007228999', 
  'Jason Lu Lijie',
  'balmoral',
  'Balmoral',
  '2025-08-10',
  'approved',
  'Admin override booking - manually created due to system issues',
  'System Admin',
  CURRENT_DATE,
  CURRENT_DATE,
  now(),
  now()
);

-- Insert manual approved bookings for Eldon (August 9th and 16th, 2025)  
INSERT INTO slot_bookings_new (
  id, employee_id, employee_name, branch_id, branch_name,
  date, status, notes, approved_by, approved_on, booked_on, created_at, updated_at
) VALUES
(
  'ADMIN_ELDON_' || extract(epoch from now())::text,
  'EMP1751006728858',
  'Aw Yi Zhe Eldon', 
  'balmoral',
  'Balmoral',
  '2025-08-09',
  'approved',
  'Admin override booking - manually created due to system issues',
  'System Admin',
  CURRENT_DATE,
  CURRENT_DATE,
  now(),
  now()
),
(
  'ADMIN_ELDON_2_' || extract(epoch from now())::text,
  'EMP1751006728858',
  'Aw Yi Zhe Eldon',
  'balmoral', 
  'Balmoral',
  '2025-08-16',
  'approved',
  'Admin override booking - manually created due to system issues',
  'System Admin',
  CURRENT_DATE,
  CURRENT_DATE,
  now(),
  now()
);

-- Reset any problematic password settings if they exist
INSERT INTO user_passwords (email, password_hash, salt, requires_change, must_change_password, password_complexity_met)
VALUES 
  ('jasonlulijie@gmail.com', 'temp_hash', 'temp_salt', false, false, true),
  ('eldon.ayz0106@gmail.com', 'temp_hash', 'temp_salt', false, false, true)
ON CONFLICT (email) 
DO UPDATE SET 
  requires_change = false,
  must_change_password = false,
  password_complexity_met = true,
  updated_at = now();

-- Add detailed booking failure logging function
CREATE OR REPLACE FUNCTION log_booking_failure(
  employee_email text,
  employee_name text,
  booking_date date,
  branch_id text,
  failure_reason text,
  system_details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO security_audit_log (
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