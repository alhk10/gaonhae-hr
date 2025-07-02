
-- Create user sessions table to replace localStorage authentication
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  session_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user passwords table to replace localStorage password storage
CREATE TABLE public.user_passwords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  requires_change BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clock status table to replace localStorage clock status
CREATE TABLE public.clock_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('clocked-in', 'clocked-out')),
  clock_in_time TIME,
  clock_out_time TIME,
  location TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system settings table to replace localStorage branch data
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clock_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR SELECT USING (true);
CREATE POLICY "Users can create sessions" ON public.user_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own sessions" ON public.user_sessions FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own sessions" ON public.user_sessions FOR DELETE USING (true);

-- Policies for user_passwords
CREATE POLICY "Users can view passwords" ON public.user_passwords FOR SELECT USING (true);
CREATE POLICY "Users can create passwords" ON public.user_passwords FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update passwords" ON public.user_passwords FOR UPDATE USING (true);
CREATE POLICY "Users can delete passwords" ON public.user_passwords FOR DELETE USING (true);

-- Policies for clock_status
CREATE POLICY "Users can view clock status" ON public.clock_status FOR SELECT USING (true);
CREATE POLICY "Users can create clock status" ON public.clock_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update clock status" ON public.clock_status FOR UPDATE USING (true);
CREATE POLICY "Users can delete clock status" ON public.clock_status FOR DELETE USING (true);

-- Policies for system_settings
CREATE POLICY "Users can view system settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Users can create system settings" ON public.system_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update system settings" ON public.system_settings FOR UPDATE USING (true);
CREATE POLICY "Users can delete system settings" ON public.system_settings FOR DELETE USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_passwords_updated_at
  BEFORE UPDATE ON public.user_passwords
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clock_status_updated_at
  BEFORE UPDATE ON public.clock_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default branches into system_settings
INSERT INTO public.system_settings (setting_key, setting_value) VALUES 
('system_branches', '[
  {"id": 1, "name": "Headquarters", "address": "123 Business District, #12-34, Singapore 068123"},
  {"id": 2, "name": "Balmoral", "address": "456 Balmoral Road, #05-67, Singapore 259856"},
  {"id": 3, "name": "Jurong West", "address": "789 Jurong West Central, #08-90, Singapore 640789"},
  {"id": 4, "name": "Kembangan", "address": "321 Kembangan Road, #03-45, Singapore 419642"},
  {"id": 5, "name": "Yishun", "address": "654 Yishun Ring Road, #07-12, Singapore 760654"},
  {"id": 6, "name": "Bukit Merah", "address": "987 Bukit Merah Central, #04-56, Singapore 150987"}
]'::jsonb);
