
-- Add device_id column to user_sessions table
ALTER TABLE public.user_sessions 
ADD COLUMN device_id text;

-- Create index for efficient device-based queries
CREATE INDEX idx_user_sessions_device_id ON public.user_sessions(device_id);

-- Create composite index for email + device_id queries
CREATE INDEX idx_user_sessions_email_device ON public.user_sessions(email, device_id);

-- Clean up any existing sessions to start fresh
DELETE FROM public.user_sessions WHERE created_at < now() - interval '1 day';
