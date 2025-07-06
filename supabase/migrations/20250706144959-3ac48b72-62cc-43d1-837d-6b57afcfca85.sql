
-- First, let's add the missing columns to the user_passwords table
ALTER TABLE public.user_passwords 
ADD COLUMN IF NOT EXISTS salt text,
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS password_complexity_met boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_password_change timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS failed_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone;

-- Create the password_history table for tracking password reuse
CREATE TABLE IF NOT EXISTS public.password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  salt text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create the failed_login_attempts table for tracking login failures
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempt_time timestamp with time zone DEFAULT now()
);

-- Create the security_audit_log table for logging security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  action text NOT NULL,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create the superadmin_users table for managing superadmin access
CREATE TABLE IF NOT EXISTS public.superadmin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email text NOT NULL UNIQUE,
  employee_name text NOT NULL,
  created_by text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  notes text
);

-- Add RLS policies for the new tables
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.superadmin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for password_history
CREATE POLICY "Users can view password history" ON public.password_history FOR SELECT USING (true);
CREATE POLICY "Users can insert password history" ON public.password_history FOR INSERT WITH CHECK (true);

-- Create policies for failed_login_attempts
CREATE POLICY "Users can view failed login attempts" ON public.failed_login_attempts FOR SELECT USING (true);
CREATE POLICY "Users can insert failed login attempts" ON public.failed_login_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete failed login attempts" ON public.failed_login_attempts FOR DELETE USING (true);

-- Create policies for security_audit_log
CREATE POLICY "Users can view security audit log" ON public.security_audit_log FOR SELECT USING (true);
CREATE POLICY "Users can insert security audit log" ON public.security_audit_log FOR INSERT WITH CHECK (true);

-- Create policies for superadmin_users
CREATE POLICY "Users can view superadmin users" ON public.superadmin_users FOR SELECT USING (true);
CREATE POLICY "Users can insert superadmin users" ON public.superadmin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update superadmin users" ON public.superadmin_users FOR UPDATE USING (true);
CREATE POLICY "Users can delete superadmin users" ON public.superadmin_users FOR DELETE USING (true);

-- Create database functions for security operations
CREATE OR REPLACE FUNCTION public.is_superadmin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.superadmin_users 
    WHERE employee_email = user_email AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_email text,
  p_action text,
  p_details jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_audit_log (user_email, action, details, ip_address, user_agent)
  VALUES (p_user_email, p_action, p_details, p_ip_address, p_user_agent);
END;
$$;
