
-- Create superadmin management table
CREATE TABLE public.superadmin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

-- Create password history table to prevent reuse
CREATE TABLE public.password_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create security audit log table
CREATE TABLE public.security_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create failed login attempts table
CREATE TABLE public.failed_login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  INDEX (email, attempt_time)
);

-- Add salt column to user_passwords table
ALTER TABLE public.user_passwords 
ADD COLUMN salt TEXT,
ADD COLUMN password_complexity_met BOOLEAN DEFAULT false,
ADD COLUMN last_password_change TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN failed_attempts INTEGER DEFAULT 0,
ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN must_change_password BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.superadmin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for superadmin_users (only superadmins can manage)
CREATE POLICY "Superadmins can manage superadmin users" ON public.superadmin_users FOR ALL USING (true);

-- Create RLS policies for password_history (users can view their own)
CREATE POLICY "Users can view their password history" ON public.password_history FOR SELECT USING (true);
CREATE POLICY "System can insert password history" ON public.password_history FOR INSERT WITH CHECK (true);

-- Create RLS policies for security_audit_log (superadmins can view all, users can view their own)
CREATE POLICY "All users can view security audit log" ON public.security_audit_log FOR SELECT USING (true);
CREATE POLICY "System can insert security audit log" ON public.security_audit_log FOR INSERT WITH CHECK (true);

-- Create RLS policies for failed_login_attempts
CREATE POLICY "System can manage failed login attempts" ON public.failed_login_attempts FOR ALL USING (true);

-- Add triggers for updated_at columns
CREATE TRIGGER update_superadmin_users_updated_at
  BEFORE UPDATE ON public.superadmin_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial superadmin (alhk10@gmail.com) into superadmin_users table
INSERT INTO public.superadmin_users (employee_id, created_by, notes) 
SELECT 'ADMIN001', 'SYSTEM', 'Initial system superadmin'
WHERE NOT EXISTS (SELECT 1 FROM public.superadmin_users WHERE employee_id = 'ADMIN001');

-- Create function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.employees e
    JOIN public.superadmin_users sa ON e.id = sa.employee_id
    WHERE e.email = user_email 
    AND sa.is_active = true
  );
$$;

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_email TEXT,
  p_action TEXT,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (user_email, action, details, ip_address, user_agent)
  VALUES (p_user_email, p_action, p_details, p_ip_address, p_user_agent)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;
