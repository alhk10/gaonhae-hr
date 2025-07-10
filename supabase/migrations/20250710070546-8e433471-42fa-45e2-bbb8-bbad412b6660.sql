
-- Add device_id column to user_sessions table for session isolation
ALTER TABLE public.user_sessions 
ADD COLUMN device_id text;

-- Create index for efficient device-specific session queries
CREATE INDEX idx_user_sessions_device_email ON public.user_sessions(device_id, email);

-- Create index for device and expiry queries
CREATE INDEX idx_user_sessions_device_expires ON public.user_sessions(device_id, expires_at);

-- Clean up any existing sessions to prevent cross-contamination
DELETE FROM public.user_sessions WHERE device_id IS NULL;
