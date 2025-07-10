
-- Add last_activity and logout_reason columns to user_sessions table
ALTER TABLE public.user_sessions 
ADD COLUMN last_activity timestamp with time zone DEFAULT now(),
ADD COLUMN logout_reason text DEFAULT 'manual';

-- Create index for efficient queries on last_activity
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity);

-- Update existing sessions to have current timestamp as last_activity
UPDATE public.user_sessions 
SET last_activity = now() 
WHERE last_activity IS NULL;
